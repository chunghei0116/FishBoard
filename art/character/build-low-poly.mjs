import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { normals, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { fileURLToPath } from "node:url";

// Derive the island asset from the authored rig, preserving every skin and clip.
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read(fileURLToPath(new URL("../../public/models/hoodie-character.glb", import.meta.url)));
// Linear base colours from build_hoodie_character.py: textured Blender materials
// export a white factor, so stripping their textures alone loses the outfit palette.
const fabricColours = {
  "Warm cream cotton hoodie": [0.72, 0.675, 0.59, 1],
  "Cream ribbed cuffs": [0.65, 0.61, 0.53, 1],
  "Washed charcoal cargo cotton": [0.045, 0.042, 0.04, 1],
  "Cargo pocket cloth": [0.052, 0.048, 0.046, 1],
  "Black woven backpack": [0.014, 0.016, 0.018, 1],
  "Warm gray sneaker suede": [0.2, 0.18, 0.17, 1],
};
for (const material of document.getRoot().listMaterials()) {
  if (material.getBaseColorTexture()) {
    const colour = fabricColours[material.getName()];
    if (!colour) throw new Error(`Add a low-poly colour for ${material.getName()}`);
    material.setBaseColorFactor(colour);
  }
  material.setBaseColorTexture(null).setNormalTexture(null).setRoughnessFactor(0.95).setMetallicFactor(0);
}
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    // Facets and solid colours replace fabric grain and smooth shading.
    for (const semantic of ["NORMAL", "TANGENT", "TEXCOORD_0", "TEXCOORD_1"]) {
      primitive.setAttribute(semantic, null);
    }
  }
}
await document.transform(
  prune(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.035, error: 0.035 }),
  normals({ overwrite: true }),
  prune(),
);
let triangles = 0;
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute("POSITION").getCount()) / 3;
  }
}
if (triangles > 12000) throw new Error(`Low-poly character exceeds budget: ${triangles} triangles`);
const output = fileURLToPath(new URL("../../public/models/hoodie-character-low-poly.glb", import.meta.url));
await io.write(output, document);
console.log(`Low-poly character: ${triangles} triangles; ${document.getRoot().listAnimations().map((clip) => clip.getName()).join(", ")}`);
