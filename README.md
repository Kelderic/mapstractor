# Mapstractor

An abstraction layer for the Google Maps Javascript API v3

## Purpose

To allow for more quickly building out simple Google Maps JS API powered web pages, without having to re-write the wheel.

## Stable Version

v2.4.0

## Functions

- Create Maps
- Add KML Layers
- Add Polygons
- Add Markers, with or without Infoboxes (Tooltips)
- Add an Searchbox, with Optional Manual Trigger Search Button, Optional Autocomplete, and Optional Search Settings Button
- Add a Share Location Button
- Manange Markers, Polygons, and Infoboxes globally

## Docs

Right now, all docs are inline. They are very thorough though, so you shouldn't have any trouble following along.

--------

## How To Use

In the source folder, there are two files. The first is the main script and the other is a stylesheet. If you download them and include them in your project, then call `new Mapstractor(args)`.

Minified versions are attached to the releases, starting with 2.4.0.

If you'd like build your own version, you'll need npm and grunt. The package.json file lists all devDependencies though, so if you just close the repo, run `npm install`, then run `grunt dist`, you'll be good to go. You can also run `grunt build` which will do the same as `dist`, except run a watch task, for live development.
