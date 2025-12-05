# LabChronicle Hide Code

[![labchronicle-hidecode](https://labextensions.dev/api/badge/labchronicle-hidecode?metric=downloads&leftColor=%23555&rightColor=%23F37620&style=flat)](https://labextensions.dev/extensions/labchronicle-hidecode)

Hide/show notebook inputs and surface LabChronicle-style parameter widgets in JupyterLab.

## Features

- Toolbar button and command (`Accel+Shift+H`) to hide/show the active cell input without touching metadata manually.
- Command to collapse every cell tagged with the configured hide tag (defaults to `hide_input` so it stays compatible with the classic `hide_input` nbextension).
- Optional auto-hide when a notebook opens; this lets LabChronicle distribute notebooks that arrive already collapsed but can be expanded on demand.
- Hidden cells stay locked even if you click into them—only the LabChronicle shortcut/button changes their visibility, preventing accidental uncollapse while reading.
- Locked cells get a small “run” affordance next to the collapser so you can execute them in place without expanding the code.
- Settings exposed through JupyterLab’s Advanced Settings Editor to change the tag name or disable the auto-hide behavior altogether.

## Usage

1. Install the extension (instructions below) and restart JupyterLab.
2. Tag any cells you would like hidden by default via **View → Cell Toolbar → Tags** and add the tag specified in the settings (`hide_input` by default).
3. Use the notebook toolbar button (or press `Accel+Shift+H`) to toggle the currently active cell.
4. Hit the “LabChronicle: Hide cells tagged for LabChronicle” command from the palette to apply the rule to the whole notebook on demand.
5. Tweak defaults under **Settings → Advanced Settings Editor → LabChronicle Hide Code**.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install labchronicle_hidecode
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall labchronicle_hidecode
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the labchronicle_hidecode directory
# Install package in development mode
pip install -e "."
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall labchronicle_hidecode
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `labchronicle-hidecode` within that folder.

### Testing the extension

#### Frontend tests

This extension is using [Jest](https://jestjs.io/) for JavaScript code testing.

To execute them, execute:

```sh
jlpm
jlpm test
```

#### Integration tests

This extension uses Playwright for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)
