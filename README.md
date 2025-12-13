# JupyterLab Hide Code

[![jupyterlab-hidecode](https://labextensions.dev/api/badge/jupyterlab-hidecode?metric=downloads&leftColor=%23555&rightColor=%23F37620&style=flat)](https://labextensions.dev/extensions/jupyterlab-hidecode)

A JupyterLab extension to hide/show notebook inputs (permanently, without accidental uncollapse) with a Colab-like play button.

## Features

### 1.- Show/Hide Code

Allows you to hide the code so it cannot be accidentally uncollapsed by clicking into the cell. You can do this by clicking the notebook toolbar button 'Show/Hide Code' or using the keyboard shortcut `Ctrl+Shift+H` (Windows/Linux) or `Cmd+Shift+H` (Mac).

> Hidden cells stay locked even if you click into them—only the JupyterLab Hide Code shortcut/button changes their visibility, preventing accidental uncollapse while reading.

![Video showing how to use the Show/Hide Code button](docs/JupyterLab_HideCode-Show_Hide_Button.gif)

### 2.- Colab-like Run Button for Locked Cells

When a cell is hidden/locked, a small "play" button appears next to the cell's collapser. Clicking this button runs the cell in place without expanding it.

> This feature is inspired by Google Colab's behavior, allowing users to execute code without revealing it. The regular cell execution methods (Shift+Enter, Run button) will still work as usual without expanding the cell.

![Video showing how to use the Run Button for locked cells](docs/JupyterLab_HideCode-Run_Button.gif)

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyterlab_hidecode
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab_hidecode
```
