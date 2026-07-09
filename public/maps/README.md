# World map assets

`ne_110m_land.geojson` — Natural Earth 110m land polygons (source for grid generation).

`world-land-grid.bin` — precomputed 0.5° land/ocean lookup grid (~250 KB).
Regenerate with `npm run globe:grid` after updating the GeoJSON.

`world-land-mask.png` — optional legacy binary mask (not used).

`world-equirect.jpg` — optional reference texture (not used).
