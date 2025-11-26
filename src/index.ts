import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, ToolbarButton } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { INotebookTracker, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { JSONExt, JSONObject, JSONValue } from '@lumino/coreutils';

namespace CommandIDs {
  export const toggleActiveCell = 'labchronicle-hidecode:toggle-active-cell';
  export const applyHideTag = 'labchronicle-hidecode:apply-hide-tag';
}

interface HidecodeSettings {
  autoHideTaggedCells: boolean;
  hideTag: string;
}

const DEFAULT_SETTINGS: HidecodeSettings = {
  autoHideTaggedCells: true,
  hideTag: 'hide_input'
};

const HIDECODE_META_KEY = 'labchronicleHideCode';
const LOCKED_CLASS = 'jp-labchronicle-hidecode-locked';
const RUN_BUTTON_CLASS = 'jp-labchronicle-run-button';
const RUN_BUTTON_RUNNING_CLASS = 'jp-labchronicle-run-button-running';
const collapserWatchers = new WeakMap<Cell, MutationObserver>();
const CATEGORY = 'LabChronicle / Hide Code';

type HidecodeMeta = {
  locked?: boolean;
};

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'labchronicle-hidecode:plugin',
  description:
    'Hide/show notebook inputs and surface LabChronicle-style parameter widgets in JupyterLab.',
  autoStart: true,
  requires: [INotebookTracker, ICommandPalette],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    palette: ICommandPalette,
    settingRegistry: ISettingRegistry | null
  ) => {
    console.log('JupyterLab extension labchronicle-hidecode is activated!');

    let settingsSnapshot: HidecodeSettings = { ...DEFAULT_SETTINGS };

    const mergeSettings = (raw: Partial<HidecodeSettings> | undefined): HidecodeSettings => ({
      ...DEFAULT_SETTINGS,
      ...(raw ?? {})
    });

    const applySettingsToOpen = () => {
      tracker.forEach(panel => autoHideIfNeeded(panel));
    };

    const syncSettings = (settings?: ISettingRegistry.ISettings) => {
      const composite = (settings?.composite ?? {}) as Partial<HidecodeSettings>;
      settingsSnapshot = mergeSettings(composite);
      applySettingsToOpen();
    };

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(loaded => {
          syncSettings(loaded);
          loaded.changed.connect(() => syncSettings(loaded));
        })
        .catch(reason => {
          console.error('Failed to load settings for labchronicle-hidecode.', reason);
        });
    }

    const toJSONObject = (value: JSONValue | undefined): JSONObject => {
      if (value !== undefined && JSONExt.isObject(value)) {
        return JSONExt.deepCopy(value) as JSONObject;
      }
      return {};
    };

    const getHidecodeMeta = (cell: Cell): HidecodeMeta => {
      const current = cell.model.getMetadata(HIDECODE_META_KEY) as JSONValue | undefined;
      const json = toJSONObject(current) as HidecodeMeta;
      return { locked: json.locked === true };
    };

    const persistHidecodeMeta = (cell: Cell, meta: HidecodeMeta) => {
      if (meta.locked) {
        cell.model.setMetadata(HIDECODE_META_KEY, meta);
        cell.node.classList.add(LOCKED_CLASS);
      } else {
        cell.model.deleteMetadata(HIDECODE_META_KEY);
        cell.node.classList.remove(LOCKED_CLASS);
      }
    };

    const isCellLocked = (cell: Cell): boolean => getHidecodeMeta(cell).locked === true;

    const ensureMetadataState = (cell: Cell, hidden: boolean) => {
      const current = cell.model.getMetadata('jupyter') as JSONValue | undefined;
      const jupyterMeta = toJSONObject(current);
      jupyterMeta.source_hidden = hidden;
      cell.model.setMetadata('jupyter', jupyterMeta);
    };

    const setCellInputHidden = (cell: Cell, hidden: boolean, lockState?: boolean) => {
      if (cell.inputHidden === hidden) {
        ensureMetadataState(cell, hidden);
        if (lockState !== undefined) {
          persistHidecodeMeta(cell, { locked: lockState });
        }
        return;
      }

      cell.inputHidden = hidden;
      ensureMetadataState(cell, hidden);
      const targetLock = lockState ?? getHidecodeMeta(cell).locked ?? false;
      persistHidecodeMeta(cell, { locked: targetLock });
    };

    const runCell = async (panel: NotebookPanel, cell: Cell) => {
      const notebook = panel.content;
      const cellIndex = notebook.widgets.indexOf(cell);
      if (cellIndex === -1) {
        return;
      }
      const originalIndex = notebook.activeCellIndex;
      notebook.activeCellIndex = cellIndex;
      try {
        await panel.sessionContext.ready;
        await NotebookActions.run(notebook, panel.sessionContext);
      } finally {
        if (originalIndex !== cellIndex && originalIndex >= 0) {
          notebook.activeCellIndex = originalIndex;
        }
      }
    };

    const ensureRunButton = (panel: NotebookPanel, cell: Cell) => {
      const collapser = cell.node.querySelector('.jp-InputCollapser') as HTMLElement | null;
      if (!collapser) {
        if (!collapserWatchers.has(cell) && !cell.isDisposed) {
          const observer = new MutationObserver(() => {
            if (cell.isDisposed) {
              observer.disconnect();
              collapserWatchers.delete(cell);
              return;
            }
            const maybeCollapser = cell.node.querySelector('.jp-InputCollapser');
            if (maybeCollapser) {
              observer.disconnect();
              collapserWatchers.delete(cell);
              ensureRunButton(panel, cell);
            }
          });
          observer.observe(cell.node, { childList: true, subtree: true });
          collapserWatchers.set(cell, observer);
          cell.disposed.connect(() => {
            observer.disconnect();
            collapserWatchers.delete(cell);
          });
        }
        return;
      }

      const existing = collapser.querySelector(`.${RUN_BUTTON_CLASS}`) as HTMLButtonElement | null;
      let button = existing ?? document.createElement('button');
      if (!existing) {
        button.type = 'button';
        button.classList.add(RUN_BUTTON_CLASS);
        button.setAttribute('aria-label', 'Run hidden cell');
        const iconWrapper = document.createElement('span');
        iconWrapper.classList.add(`${RUN_BUTTON_CLASS}-icon`);
        iconWrapper.innerHTML =
          "<svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path d='M8 5v14l11-7z'></path></svg>";
        button.appendChild(iconWrapper);
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          void (async () => {
            try {
              button.classList.add(RUN_BUTTON_RUNNING_CLASS);
              button.disabled = true;
              await runCell(panel, cell);
            } catch (error) {
              console.error('Failed to run hidden cell', error);
            } finally {
              button.classList.remove(RUN_BUTTON_RUNNING_CLASS);
              button.disabled = false;
              enforceLockedState(panel, cell);
            }
          })();
        });
        collapser.appendChild(button);
      }

      button.style.display = isCellLocked(cell) ? 'flex' : 'none';
    };

    const toggleActiveCellInput = (panel?: NotebookPanel) => {
      const notebookPanel = panel ?? tracker.currentWidget;
      const notebook = notebookPanel?.content;
      const cell = notebook?.activeCell;
      if (!notebookPanel || !cell) {
        return;
      }

      const nextHidden = !cell.inputHidden;
      setCellInputHidden(cell, nextHidden, nextHidden);
      ensureRunButton(notebookPanel, cell);
      notebookPanel.content.update();
    };

    const applyHideTagToPanel = (panel: NotebookPanel, force = true) => {
      const tag = settingsSnapshot.hideTag;
      if (!tag) {
        return;
      }

      panel.content.widgets.forEach(cell => {
        const tagsValue = cell.model.getMetadata('tags');
        const tags = Array.isArray(tagsValue) ? (tagsValue as string[]) : [];
        if (tags.includes(tag)) {
          setCellInputHidden(cell, force, true);
          ensureRunButton(panel, cell);
        }
      });

      panel.content.update();
    };

    const autoHideIfNeeded = (panel: NotebookPanel) => {
      if (settingsSnapshot.autoHideTaggedCells) {
        applyHideTagToPanel(panel, true);
      }
    };

    const enforceLockedState = (panel: NotebookPanel, cell: Cell) => {
      if (isCellLocked(cell)) {
        setCellInputHidden(cell, true, true);
      } else if (!cell.inputHidden) {
        cell.node.classList.remove(LOCKED_CLASS);
      }
      ensureRunButton(panel, cell);
    };

    const registerInteractionGuards = (panel: NotebookPanel) => {
      const guard = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target) {
          return;
        }
        if (target.closest(`.${RUN_BUTTON_CLASS}`)) {
          return;
        }
        if (
          !target.closest('.jp-InputPlaceholder') &&
          !target.closest('.jp-Collapser')
        ) {
          return;
        }
        const cellNode = target.closest('.jp-Cell');
        if (!cellNode) {
          return;
        }
        const cell = panel.content.widgets.find(widget => widget.node === cellNode);
        if (cell && isCellLocked(cell)) {
          requestAnimationFrame(() => enforceLockedState(panel, cell));
        }
      };

      panel.content.node.addEventListener('mousedown', guard, true);
      panel.content.node.addEventListener('click', guard, true);
      panel.content.node.addEventListener('dblclick', guard, true);

      return () => {
        panel.content.node.removeEventListener('mousedown', guard, true);
        panel.content.node.removeEventListener('click', guard, true);
        panel.content.node.removeEventListener('dblclick', guard, true);
      };
    };

    app.commands.addCommand(CommandIDs.toggleActiveCell, {
      label: 'Toggle active cell input visibility',
      caption: 'Collapse or expand the current cell input area',
      execute: () => toggleActiveCellInput()
    });
    palette.addItem({ category: CATEGORY, command: CommandIDs.toggleActiveCell });

    app.commands.addCommand(CommandIDs.applyHideTag, {
      label: 'Hide cells tagged for LabChronicle',
      caption: 'Collapse all cells that contain the configured hide tag',
      execute: () => {
        const notebook = tracker.currentWidget;
        if (notebook) {
          applyHideTagToPanel(notebook);
        }
      }
    });
    palette.addItem({ category: CATEGORY, command: CommandIDs.applyHideTag });

    tracker.widgetAdded.connect((_, panel) => {
      const toggleButton = new ToolbarButton({
        label: 'Show/Hide code',
        className: 'jp-labchronicle-show-code-button',
        tooltip: 'LabChronicle: hide/show active cell input',
        onClick: () => toggleActiveCellInput(panel)
      });
      panel.toolbar.insertItem(10, 'labchronicleHideInput', toggleButton);

      const enforceActiveCell = () => {
        const active = panel.content.activeCell;
        if (active) {
          enforceLockedState(panel, active);
        }
      };

      const enforceAllCells = () => {
        panel.content.widgets.forEach(cell => enforceLockedState(panel, cell));
      };

      const ensureButtonsForAll = () => {
        panel.content.widgets.forEach(cell => ensureRunButton(panel, cell));
      };

      panel.content.activeCellChanged.connect(enforceActiveCell);

      const cellsModel = panel.content.model?.cells ?? null;
      let modelChangedHandler: ((sender: any, args: any) => void) | null = null;

      if (cellsModel) {
        modelChangedHandler = () => {
          requestAnimationFrame(() => {
            enforceAllCells();
            ensureButtonsForAll();
          });
        };
        cellsModel.changed.connect(modelChangedHandler);
      }

      const removeGuards = registerInteractionGuards(panel);

      const notebookObserver = new MutationObserver(() => {
        ensureButtonsForAll();
      });
      notebookObserver.observe(panel.content.node, {
        childList: true,
        subtree: true
      });

      panel.disposed.connect(() => {
        toggleButton.dispose();
        panel.content.activeCellChanged.disconnect(enforceActiveCell);
        if (cellsModel && modelChangedHandler) {
          cellsModel.changed.disconnect(modelChangedHandler);
        }
        removeGuards();
        notebookObserver.disconnect();
      });

      void panel.context.ready.then(() => {
        autoHideIfNeeded(panel);
        enforceAllCells();
        ensureButtonsForAll();
      });
    });
  }
};

export default plugin;
