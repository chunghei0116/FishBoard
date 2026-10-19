"""Reusable Blender mesh, cloth, and PBR material helpers."""
import bpy,math,os
import numpy as np
from mathutils import Vector
from math import sin,cos,pi
assets=[]
rng=np.random.default_rng(17)

def mat(name,color,rough=.72,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def P(x,y,z):return (x,-z,y)

def finish(obj,name,material,bone=None):
 obj.name=name;obj.data.materials.clear();obj.data.materials.append(material)
 for p in obj.data.polygons:p.use_smooth=True
 if bone:obj['bind_bone']=bone
 assets.append(obj);return obj

def apply_transform(o):
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)

def uv(name,loc,scale,material,bone=None,segments=40):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=24,location=P(*loc));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);apply_transform(o);return finish(o,name,material,bone)

def rounded(name,loc,size,r,material,bone=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=P(*loc));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);apply_transform(o)
 bevel=o.modifiers.new('Soft tailored edges','BEVEL');bevel.width=r;bevel.segments=4;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 return finish(o,name,material,bone)

def tube(name,points,r,material,bone=None):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=12;curve.bevel_depth=r;curve.bevel_resolution=3
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for bp,p in zip(spline.bezier_points,points):bp.co=P(*p);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return finish(o,name,material,bone)

def rings(name,rows,material,bone=None,centerx=0,sub=1):
 verts=[];faces=[];n=40
 for up,rx,rz,forward in rows:
  for j in range(n):
   a=j/n*2*pi;fold=1+.012*cos(a*6+up*4)
   verts.append(P(centerx+rx*cos(a)*fold,up,forward+rz*sin(a)*fold))
 for i in range(len(rows)-1):
  for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
 faces.append(tuple(reversed(tuple(range(n)))));faces.append(tuple((len(rows)-1)*n+j for j in range(n)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.flip_normals();mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,material,bone)
 if sub:
  m=o.modifiers.new('Sculpted cloth smoothing','SUBSURF');m.levels=sub;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 return o

def merge_sculpt(parts,name,material,voxel=.018):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 assets[:]=[x for x in assets if x not in parts]
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=parts[0]
 m=o.modifiers.new('Unified sculpt surface','REMESH');m.mode='VOXEL';m.voxel_size=voxel; m.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=m.name)
 m=o.modifiers.new('Polished sculpt','SMOOTH');m.factor=1.1;m.iterations=5;bpy.ops.object.modifier_apply(modifier=m.name)
 dec=o.modifiers.new('Game topology','DECIMATE');dec.ratio=.62;bpy.ops.object.modifier_apply(modifier=dec.name)
 finish(o,name,material,'Head');o.select_set(False);return o

def fabric_material(name,base,rough=.82,kind='cloth'):
 m=mat(name,base,rough);nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF')
 size=512;y,x=np.mgrid[0:size,0:size];noise=rng.normal(0,.018,(size,size))
 if kind=='cloth':detail=.022*np.sin(x*pi/2)+.020*np.cos(y*pi/2)+.012*np.sin((x+y)*.45)
 else:detail=rng.normal(0,.022,(size,size))+.009*np.sin(x*.08+y*.13)
 pixels=np.empty((size,size,4),dtype=np.float32)
 # Material base values are linear; image pixels use explicit non-color linear data.
 for c in range(3):pixels[:,:,c]=np.clip(base[c]*(1+noise+detail),0,1)
 pixels[:,:,3]=1
 # Albedo must be sRGB-encoded in the file, so Blender and glTF decode it once.
 pixels[:,:,:3]=np.where(pixels[:,:,:3]<=.0031308,pixels[:,:,:3]*12.92,1.055*np.maximum(pixels[:,:,:3],0)**(1/2.4)-.055)
 image=bpy.data.images.new(name+' / woven albedo',width=size,height=size);image.colorspace_settings.name='sRGB';image.pixels.foreach_set(pixels.ravel());image.pack()
 tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(tex.outputs['Color'],p.inputs['Base Color'])
 mapping=nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(3,3,3)
 uvnode=nodes.new('ShaderNodeTexCoord');links.new(uvnode.outputs['UV'],mapping.inputs['Vector']);links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
 # Export a tangent-space normal map; never reinterpret albedo as normal data.
 height=noise+detail;dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*.7;dy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*.7
 normals=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);normals/=np.linalg.norm(normals,axis=2,keepdims=True)
 normal_pixels=np.ones((size,size,4),dtype=np.float32);normal_pixels[:,:,:3]=normals*.5+.5
 normal_image=bpy.data.images.new(name+' / micro surface normals',width=size,height=size);normal_image.colorspace_settings.name='Non-Color';normal_image.pixels.foreach_set(normal_pixels.ravel());normal_image.pack()
 normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=normal_image;links.new(mapping.outputs['Vector'],normal_tex.inputs['Vector'])
 normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.18;links.new(normal_tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
 return m

def unwrap(obj):
 if not obj.data.uv_layers:obj.data.uv_layers.new(name='UVMap')
 layer=obj.data.uv_layers.active
 verts=obj.data.vertices
 for face in obj.data.polygons:
  for li in face.loop_indices:
   co=verts[obj.data.loops[li].vertex_index].co
   layer.data[li].uv=((math.atan2(co.y,co.x)+pi)/(2*pi),co.z*.5)
 return obj

def tapered_lock(name,points,r,material,bone='Head',flatten=.75):
 # A dense Bezier path with changing radius creates a smooth sculptural strand.
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=20;curve.bevel_depth=r;curve.bevel_resolution=4;curve.use_fill_caps=True
 sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for i,(bp,p) in enumerate(zip(sp.bezier_points,points)):
  bp.co=P(*p);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO';bp.radius=[.35,1,.70,.015][min(i,3)]
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return finish(o,name,material,bone)

def ribbon(name,points,width,material,bone):
 curve=bpy.data.curves.new(name+' path','CURVE');curve.dimensions='3D';curve.resolution_u=18
 sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for bp,p in zip(sp.bezier_points,points):bp.co=P(*p);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 # Sample a Bezier curve to create a draped strip with slight ripples.
 from mathutils.geometry import interpolate_bezier
 samples=[]
 for i in range(len(points)-1):samples+=interpolate_bezier(sp.bezier_points[i].co,sp.bezier_points[i].handle_right,sp.bezier_points[i+1].handle_left,sp.bezier_points[i+1].co,10)[:-1]
 samples.append(sp.bezier_points[-1].co);verts=[];faces=[]
 for i,p in enumerate(samples):
  t=i/(len(samples)-1);w=width*(1-.22*t);wave=.005*sin(t*pi*5)
  for sign in [-1,1]:verts.append((p.x+sign*w/2,p.y+wave+sign*.008*sin(t*pi*2),p.z))
 for i in range(len(samples)-1):k=i*2;faces.append((k,k+2,k+3,k+1))
 geo=bpy.data.meshes.new(name);geo.from_pydata(verts,[],faces);geo.update();o=bpy.data.objects.new(name,geo);bpy.context.collection.objects.link(o);finish(o,name,material,bone);unwrap(o);m=o.modifiers.new('Fabric thickness','SOLIDIFY');m.thickness=.009;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 return o
