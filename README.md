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

MUch of the data has been already converted to a sql db, for use in the calculation methods.
For visualising individual structures you need to have a zipped "structures.tar.gz" containing all the structures at the same level as the docker-compose.
This is availible on the MaterialsCloud S3.

### Plots

The plots can be configured using a few YAML files:

- `figure/columns.yml`: defines metadata for columns of CSV file
- `figure/filters.yml`: defines filters available in plot
- `figure/presets.yml`: defines presets for axis + filter settings

## Docker

```
docker compose build
docker compose up
# open http://localhost:3249/select-figure
```
