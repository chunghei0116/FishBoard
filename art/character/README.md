# Fishboard Blender character

`hoodie-character.blend` is the editable Blender 5.2 source, with named materials, smooth meshes, skin weights, a 15-bone armature, Idle/Walk actions, and a portrait lighting setup. The saved scene previews Idle. Walk is available as an action and a muted NLA track.

`../../public/models/hoodie-character.glb` is the full-detail export. The island loads `hoodie-character-low-poly.glb`, a derivative with 8,575 triangles, flat face normals and solid colours instead of fabric textures. It keeps the cream hoodie, cargo trousers, backpack, original skin weights, and Idle/Walk clips. The mixer blends Idle and Walk and synchronizes the walk phase to movement distance.

After exporting changes from Blender, regenerate the runtime model with:

```sh
node art/character/build-low-poly.mjs
```

The generator uses the pinned development dependencies glTF Transform and meshoptimizer. It preserves the authored rig and animations and enforces a 12,000-triangle ceiling. The detailed `.blend` and original `.glb` remain the editable source; do not overwrite them with the simplified asset.

Edit the `.blend` in Blender, then export selected character meshes and the armature as glTF Binary with skinning and animation enabled. Preserve the `Idle` and `Walk` clip names. Forward is Blender -Y, up is Z; the exporter converts to Three.js coordinates.

`build_hoodie_character.py` recreates the hoodie-and-cargo character from the reference. Re-running it **overwrites the generated .blend and .glb**, so save subsequent hand edits separately first:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python art/character/build_hoodie_character.py
```

Set `FISHBOARD_SKIP_RENDER=1` to regenerate without the portrait render. Model generation uses only Blender's built-in tools; no third-party models or add-ons are required.

Checks: `node --test tests/blender-character.test.mjs` checks valid skinning/animation data, asset vertex limits, outward-facing cloth topology, and knee direction throughout the exported walk.
