# CCGenome

Using

- bokeh server
- sqlite database backend
  (AiiDA database backend in alpha)
- jsmol for structure visualization

## Prerequisites

- python
- nodejs >= 6

## Installation

```
pip install -e .     # install python dependencies
bokeh serve --show figure detail   # run app
```

## Configuration

Feel free to adapt this app to your own needs:

### Input data

The data has been already converted to a sql db, for use in the calculation methods.

### Plots

The plots can be configured using a few YAML files:

- `figure/columns.yml`: defines metadata for columns of CSV file
- `figure/filters.yml`: defines filters available in plot
- `figure/presets.yml`: defines presets for axis + filter settings

## Docker

```
docker-compose build
docker-compose up
# open http://localhost:3245/ccg/select-figure
```
