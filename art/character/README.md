# Island angler · original low-poly character

The island uses `public/models/island-angler.glb`, a newly modelled character made from deliberately simple geometry. It is not a decimated version of the earlier hoodie model.

## Design

- Sand-coloured, eight-sided bucket hat with a broad ten-sided brim, olive band and small brass badge.
- Calm face with small dark eyes, angular smile, cropped brown hair and warm skin. The head is slightly oversized to read clearly from the island camera.
- Sea-blue short-sleeved shirt, open olive fishing vest, two utility pockets and a small field notebook.
- Dark teal shorts, cream socks and brown deck boots. Bevelled edges keep the solid shapes from looking like sharp cubes.
- Small rust canvas equipment pack with a sand flap, brass clasp, shoulder straps and a rolled blue mat.
- Solid matte colours, visible triangular facets and no fabric or normal textures. Colours complement the island's sand, greenery and water.

The exported character has **1,552 triangles**, is approximately **225 KB**, and stands about 2.4 island units tall, facing +Z with Y up. It uses a transform hierarchy for the torso, head, hips, knees, arms and elbows; it requires no skinning or external textures.

## Build and animation

`build-island-angler.mjs` is the editable modelling source. It uses the existing Three.js dependency, creates the geometry, then exports a standalone GLB with named `Idle` and `Walk` clips:

```sh
npm run build:character
node --test tests/island-angler.test.mjs tests/character-motion.test.mjs
```

The script overwrites only `public/models/island-angler.glb`. No Blender installation or extra asset-processing packages are required.

Animation is sampled from the shared `lib/character-motion.ts` gait. Idle includes a small breath and head turn; Walk includes opposing arm/leg swings, backward knee bends and slight torso lean. Both clips loop without a pose jump. The existing runtime mixer blends the clips and ties walk phase to distance, preserving island controls, heading, collision and station interactions. Reduced motion displays the resting pose.

The tests load the exported asset, check its scale, flat face normals, equipment and triangle budget, then sample idle/walk blends to verify the loop seam, knee direction and foot clearance. Regenerate and inspect the asset after editing proportions.

## Earlier Blender reference

The previous `hoodie-character.blend`, portrait, Python authoring scripts and `public/models/hoodie-character.glb` remain as source/reference material. They are not loaded by the island. Their original rig/topology tests remain in `tests/blender-character.test.mjs`.
