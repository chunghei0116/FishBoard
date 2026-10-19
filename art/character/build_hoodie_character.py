"""Original rigged character modeled from the user's hoodie-and-cargo reference.
Blender --background --factory-startup --python build_hoodie_character.py
"""
import bpy,os,sys,math
from mathutils import Vector
from math import sin,cos,pi
sys.path.insert(0,os.path.dirname(__file__))
from blender_character_tools import *
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'));OUT=os.path.dirname(__file__)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
cream=fabric_material('Warm cream cotton hoodie',(.72,.675,.59),.88)
rib=fabric_material('Cream ribbed cuffs',(.65,.61,.53),.86)
charcoal=fabric_material('Washed charcoal cargo cotton',(.045,.042,.040),.91)
pocketmat=fabric_material('Cargo pocket cloth',(.052,.048,.046),.9)
nylon=fabric_material('Black woven backpack',(.014,.016,.018),.83)
webbing=mat('Backpack webbing',(.023,.026,.028),.89)
zipper=mat('Dark gunmetal',(.075,.079,.08),.44,.5)
rubber=mat('Ivory sneaker rubber',(.71,.70,.65),.75)
shoegray=fabric_material('Warm gray sneaker suede',(.20,.18,.17),.82)
solemat=mat('Charcoal outsole',(.07,.065,.06),.8)
shoewhite=mat('Cream sneaker panels',(.79,.77,.71),.75)
skin=mat('Peach skin',(.79,.52,.35),.58);hand_skin=mat('Warm hands',(.79,.52,.35),.6)
darkhair=mat('Deep brown wavy hair',(.040,.024,.020),.64);hairshine=mat('Brown curl highlights',(.052,.030,.024),.67)
white=mat('Soft eye whites',(.91,.89,.82),.4);iris=mat('Chocolate irises',(.060,.027,.016),.22);pupil=mat('Deep pupils',(.008,.006,.005),.14);shine=mat('Eye highlights',(1,1,1),.12);mouthmat=mat('Warm smile',(.27,.10,.065),.75)
logo=mat('Muted gray planet embroidery',(.19,.18,.17),.86)
# Reference face: round cheeks, large brown eyes, small nose, warm expression.
face=uv('Face foundation',(0,1.94,0),(.355,.342,.29),skin,'Head',56)
for v in face.data.vertices:
 h=v.co.z/.342;v.co.x*=1-.10*max(0,-h)**1.2+.018*math.exp(-((h+.1)/.3)**2)
head=merge_sculpt([face,uv('Left ear',(-.348,1.925,0),(.058,.079,.046),skin),uv('Right ear',(.348,1.925,0),(.058,.079,.046),skin),uv('Soft nose',(0,1.866,.287),(.029,.025,.030),skin)],'Round sculpted face',skin,.009)
color=head.data.color_attributes.new(name='Skin tint',type='FLOAT_COLOR',domain='CORNER')
for poly in head.data.polygons:
 for li in poly.loop_indices:
  co=head.matrix_world@head.data.vertices[head.data.loops[li].vertex_index].co;front=-co.y
  blush=math.exp(-((abs(co.x)-.22)/.075)**2-((co.z-1.85)/.045)**2)*max(0,min(1,(front-.12)/.1));w=.26*blush;base=(.79,.52,.35);tint=(.80,.31,.25)
  color.data[li].color=tuple(base[c]*(1-w)+tint[c]*w for c in range(3))+(1,)
node=skin.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Skin tint';skin.node_tree.links.new(node.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def depth(x,up):return .29*math.sqrt(max(.05,1-(x/.355)**2-((up-1.94)/.342)**2))
for side in [-1,1]:
 cx=side*.135;cy=1.966;verts=[];faces=[];n=48
 for i in range(9):
  r=max(.0001,i/8)
  for j in range(n):
   a=j/n*2*pi;x=cx+.091*r*cos(a);up=cy+.086*r*sin(a)*(1-.14*abs(cos(a)));verts.append(P(x,up,depth(x,up)+.004+.012*(1-r*r)))
 for i in range(8):
  for j in range(n):k=i*n+j;kk=i*n+(j+1)%n;faces.append((k,k+n,kk+n,kk))
 geo=bpy.data.meshes.new('Large curved eye');geo.from_pydata(verts,[],faces);geo.update();o=bpy.data.objects.new('Eye white '+str(side),geo);bpy.context.collection.objects.link(o);finish(o,o.name,white,'Head')
 d=depth(cx,cy)+.020
 uv('Brown iris '+str(side),(cx,cy,d),(.074,.079,.008),iris,'Head')
 uv('Dark pupil '+str(side),(cx,cy+.003,d+.007),(.049,.060,.004),pupil,'Head')
 uv('Large eye shine '+str(side),(cx-.017,cy+.032,d+.012),(.016,.018,.003),shine,'Head',24)
 uv('Small eye shine '+str(side),(cx+.022,cy-.030,d+.012),(.005,.007,.002),shine,'Head',16)
 upper=[];lower=[]
 for i in range(17):
  a=pi*i/16;x=cx+.092*cos(a);up=cy+.088*sin(a)*(1-.14*abs(cos(a)));upper.append((x,up,depth(x,up)+.008));up=cy-.085*sin(a)*(1-.14*abs(cos(a)));lower.append((x,up,depth(x,up)+.007))
 tube('Upper eyelid '+str(side),upper,.007,hand_skin,'Head');tube('Lower eyelid '+str(side),lower,.004,hand_skin,'Head')
 points=[(cx-side*.066,2.098,depth(cx-side*.066,2.098)+.008),(cx,2.108,depth(cx,2.108)+.009),(cx+side*.063,2.099,depth(cx+side*.063,2.099)+.008)]
 tube('Soft expressive brow '+str(side),points,.012,darkhair,'Head')
tube('Small friendly smile',[(-.045,1.803,depth(-.045,1.803)+.005),(0,1.792,depth(0,1.792)+.007),(.045,1.804,depth(.045,1.804)+.005)],.005,mouthmat,'Head')
# Thick, center-parted wavy hair. Layered curved locks define the silhouette.
hairbase=merge_sculpt([uv('Back hair',(0,2.01,-.075),(.365,.345,.285),darkhair),uv('Crown volume',(0,2.235,-.035),(.29,.18,.245),darkhair)],'Wavy hair foundation',darkhair,.013)
for side in [-1,1]:
 tapered_lock('Center parted crown '+str(side),[(side*.008,2.33,.08),(side*.13,2.42,.19),(side*.28,2.28,.27),(side*.33,2.09,.20)],.082,darkhair)
 tapered_lock('Front curtain wave '+str(side),[(side*.015,2.32,.15),(side*.14,2.30,.30),(side*.27,2.15,.32),(side*.39,2.07,.16)],.075,hairshine)
 tapered_lock('Outer flowing wave '+str(side),[(side*.23,2.31,.08),(side*.35,2.24,.15),(side*.38,2.10,.11),(side*.46,2.13,-.005)],.067,darkhair)
 tapered_lock('Temple curl '+str(side),[(side*.31,2.17,.04),(side*.37,2.07,.06),(side*.38,1.98,.01),(side*.425,2.015,-.085)],.060,darkhair)
 tapered_lock('Lower side curl '+str(side),[(side*.32,1.99,-.08),(side*.35,1.90,-.10),(side*.32,1.83,-.14),(side*.375,1.835,-.20)],.052,hairshine)
 for strand in range(4):
  shift=(strand-1.5)*.014
  tapered_lock('Sculpted curtain strand '+str(side)+' '+str(strand),[(side*(.025+shift),2.34,.185),(side*(.14+shift),2.32,.361),(side*(.27+shift),2.17,.366),(side*(.37+shift),2.075,.18)],.0035,hairshine)
 # Fine broad ridges suggest hair strands without a noisy wire effect.
 tube('Hair wave ridge '+str(side),[(side*.03,2.36,.15),(side*.15,2.38,.23),(side*.28,2.25,.29)],.006,hairshine,'Head')
# Swept overlapping locks continue around the back for the top-down game camera.
for k in range(-3,4):
 x=k*.075;back=-.075-.285*math.sqrt(max(.15,1-(x/.365)**2))
 tapered_lock('Swept back hair '+str(k),[(x*.65,2.29,-.20),(x,2.16,back-.008),(x+.025,1.99,back-.012),(x+.018,1.82,-.235)],.038,darkhair)
# Neck and a naturally draped hoodie collar / hood behind the head.
neck=rings('Neck',[(1.50,.09,.08,0),(1.66,.09,.08,0)],hand_skin,'Head',sub=1)
hood=uv('Soft resting hood',(0,1.57,-.105),(.252,.135,.17),cream,'Spine');unwrap(hood)
tube('Thick folded hood rim',[(-.175,1.565,.105),(-.23,1.64,.005),(-.18,1.69,-.135),(0,1.70,-.22),(.18,1.69,-.135),(.23,1.64,.005),(.175,1.565,.105)],.043,cream,'Spine')
# Oversized cream sweatshirt, with a relaxed waist and ribbed hem.
body=rings('Hoodie body',[(.835,.25,.165,0),(.855,.30,.19,0),(.96,.322,.22,0),(1.16,.325,.221,0),(1.36,.305,.193,0),(1.47,.26,.153,0),(1.535,.15,.095,0)],cream,'Spine',sub=2);unwrap(body)
hem=rings('Hoodie ribbed hem',[(.83,.27,.18,0),(.847,.300,.198,0),(.895,.304,.20,0),(.91,.29,.188,0)],rib,'Spine',sub=1);unwrap(hem)
for side in [-1,1]:
 tube('Cream drawstring '+str(side),[(side*.083,1.535,.125),(side*.10,1.46,.198),(side*.085,1.365,.229)],.006,cream,'Spine')
 uv('Drawstring tip '+str(side),(side*.085,1.36,.231),(.007,.020,.007),zipper,'Spine',16)
# Kangaroo pocket conforms to the belly instead of floating as a rectangular box.
verts=[];faces=[];rows=12;cols=24
for i in range(rows+1):
 t=i/rows;up=.925+t*.235;half=.185+.045*sin(pi*t)
 for j in range(cols+1):
  u=j/cols;x=(u-.5)*half*2;front=.222*math.sqrt(max(.1,1-(x/.335)**2))+.008+.025*sin(pi*u)*sin(pi*t);verts.append(P(x,up,front))
for i in range(rows):
 for j in range(cols):k=i*(cols+1)+j;faces.append((k,k+cols+1,k+cols+2,k+1))
geo=bpy.data.meshes.new('Curved kangaroo pocket');geo.from_pydata(verts,[],faces);geo.update();pocket=bpy.data.objects.new('Kangaroo pocket',geo);bpy.context.collection.objects.link(pocket);finish(pocket,pocket.name,cream,'Spine');unwrap(pocket);m=pocket.modifiers.new('Pocket cloth thickness','SOLIDIFY');m.thickness=.012;bpy.context.view_layer.objects.active=pocket;bpy.ops.object.modifier_apply(modifier=m.name)
for side in [-1,1]:tube('Pocket opening seam '+str(side),[(side*.19,.94,.19),(side*.218,1.04,.18),(side*.19,1.15,.195)],.005,rib,'Spine')
tube('Pocket bottom seam',[(-.17,.936,.19),(0,.925,.235),(.17,.936,.19)],.004,rib,'Spine')
# Small muted planet emblem, as in the supplied reference.
planet=uv('Embroidered planet',(0,1.305,.242),(.039,.031,.004),logo,'Spine',24)
ring=[]
for i in range(49):
 a=i/48*2*pi;x=.071*cos(a);up=.024*sin(a);ring.append((x*cos(.48)-up*sin(.48),1.305+x*sin(.48)+up*cos(.48),.249))
tube('Planet orbit embroidery',ring,.005,logo,'Spine')
# Sleeves curve from the shoulder to wrists tucked into the pocket.
def sleeve(side,tag):
 rows=[(side*.29,1.49,-.01,.072,.073),(side*.33,1.43,0,.10,.10),(side*.37,1.30,.005,.112,.105),(side*.375,1.20,.025,.112,.105),(side*.35,1.125,.09,.108,.10),(side*.30,1.065,.17,.105,.09),(side*.245,1.045,.202,.077,.074)]
 verts=[];faces=[];n=40
 for i,(cx,up,front,rx,rz) in enumerate(rows):
  for j in range(n):
   a=j/n*2*pi;fold=1+.025*sin(a*5+i*1.3);verts.append(P(cx+rx*cos(a)*fold,up,front+rz*sin(a)*fold))
 for i in range(len(rows)-1):
  for j in range(n):k=i*n+j;kk=i*n+(j+1)%n;faces.append((k,kk,kk+n,k+n))
 faces.append(tuple(reversed(tuple(range(n)))));faces.append(tuple((len(rows)-1)*n+j for j in range(n)))
 geo=bpy.data.meshes.new('Hoodie sleeve '+tag);geo.from_pydata(verts,[],faces);geo.update();o=bpy.data.objects.new('Hoodie sleeve '+tag,geo);bpy.context.collection.objects.link(o);finish(o,o.name,cream);unwrap(o);m=o.modifiers.new('Relaxed sleeve smoothing','SUBSURF');m.levels=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name);return o
limb_bind=[]
for side,tag in [(-1,'L'),(1,'R')]:
 arm=sleeve(side,tag);limb_bind.append((arm,'UpperArm.'+tag,'Forearm.'+tag,1.19,.08))
 cuff=uv('Ribbed wrist '+tag,(side*.248,1.046,.202),(.083,.053,.080),rib,'Forearm.'+tag);unwrap(cuff)
 uv('Hand in pocket '+tag,(side*.20,1.016,.191),(.060,.068,.049),hand_skin,'Hand.'+tag)
 uv('Thumb at pocket '+tag,(side*.18,1.053,.237),(.024,.037,.024),hand_skin,'Hand.'+tag,24)
 # Baggy, lightly stacked cargo pants and sculpted ankle folds.
 leg=rings('Cargo trousers '+tag,[(.17,.135,.14,.025),(.21,.172,.168,.010),(.28,.179,.166,.005),(.35,.155,.145,0),(.51,.165,.152,0),(.70,.171,.156,0),(.86,.158,.15,0),(.91,.12,.115,0)],charcoal,None,side*.19,sub=2);unwrap(leg);limb_bind.append((leg,'Thigh.'+tag,'Shin.'+tag,.50,.09))
 for j in range(2):tube('Cargo ankle fold '+tag+str(j),[(side*.19-.12,.245+j*.05,.12),(side*.19,.224+j*.05,.16),(side*.19+.12,.25+j*.05,.12)],.008,pocketmat,'Shin.'+tag)
 # Two cloth cargo pockets on each outer front thigh.
 for up,height in [(.64,.17),(.435,.15)]:
  vs=[];fs=[];n=12
  for i in range(n+1):
   t=i/n
   for j in range(n+1):
    u=j/n;x=side*(.283+(u-.5)*.13);z=up+(t-.5)*height;front=.156*math.sqrt(max(.04,1-((x-side*.19)/.181)**2))+.012+.012*sin(pi*u)*sin(pi*t);vs.append(P(x,z,front))
  for i in range(n):
   for j in range(n):k=i*(n+1)+j;fs.append((k,k+n+1,k+n+2,k+1))
  geo=bpy.data.meshes.new('Cargo pocket cloth');geo.from_pydata(vs,[],fs);geo.update();o=bpy.data.objects.new('Cargo pocket '+tag+' '+str(up),geo);bpy.context.collection.objects.link(o);finish(o,o.name,pocketmat,'Thigh.'+tag if up>.5 else 'Shin.'+tag);unwrap(o)
  tube('Cargo flap '+tag+str(up),[(side*.225,up+height*.33,.163),(side*.285,up+height*.33,.145),(side*.342,up+height*.33,.10)],.009,pocketmat,'Thigh.'+tag if up>.5 else 'Shin.'+tag)
 # Chunky gray-and-cream sneakers with layered soles, toe caps and real laces.
 shoe=uv('Suede sneaker '+tag,(side*.19,.125,.075),(.150,.108,.225),shoegray,'Foot.'+tag);unwrap(shoe)
 uv('Ivory chunky midsole '+tag,(side*.19,.049,.075),(.158,.042,.238),rubber,'Foot.'+tag)
 uv('Charcoal tread '+tag,(side*.19,.018,.076),(.155,.018,.232),solemat,'Foot.'+tag)
 uv('Cream toe panel '+tag,(side*.19,.117,.225),(.139,.068,.074),shoewhite,'Foot.'+tag)
 uv('Sneaker tongue '+tag,(side*.19,.195,.108),(.069,.054,.040),shoewhite,'Foot.'+tag)
 for j in range(4):
  up=.145+j*.014;front=.075+.225*math.sqrt(max(.1,1-((up-.125)/.108)**2))+.007
  tube('Sneaker lace '+tag+str(j),[(side*.19-.056,up,front),(side*.19+.056,up+.004,front)],.0045,shoewhite,'Foot.'+tag)
 tube('Sneaker side cream trim '+tag,[(side*.19+side*.13,.085,.22),(side*.19+side*.151,.13,.08),(side*.19+side*.11,.19,-.04)],.013,shoewhite,'Foot.'+tag)
# Black backpack with padded shoulder straps and understated webbing hardware.
pack=uv('Black canvas backpack',(0,1.255,-.26),(.285,.325,.16),nylon,'Spine');unwrap(pack)
frontpack=uv('Backpack rear pocket',(0,1.13,-.394),(.215,.19,.052),nylon,'Spine');unwrap(frontpack)
for side in [-1,1]:
 ribbon('Padded black shoulder strap '+str(side),[(side*.20,1.54,.07),(side*.25,1.43,.20),(side*.245,1.23,.255),(side*.25,1.075,.20)],.074,nylon,'Spine')
 rounded('Strap adjuster '+str(side),(side*.245,1.17,.266),(.067,.047,.014),.012,zipper,'Spine')
 for j in range(2):tube('Strap webbing stitch '+str(side)+str(j),[(side*.245-.024,1.15+j*.018,.264),(side*.245+.024,1.15+j*.018,.264)],.002,webbing,'Spine')
tube('Backpack zipper',[(-.22,1.47,-.35),(0,1.54,-.415),(.22,1.47,-.35),(.265,1.23,-.30)],.008,zipper,'Spine')
tube('Backpack grab handle',[(-.07,1.55,-.27),(-.065,1.635,-.28),(.065,1.635,-.28),(.07,1.55,-.27)],.015,webbing,'Spine')
# Real armature with skinned mesh vertex groups, not runtime primitive rotations.
bpy.ops.object.select_all(action='DESELECT');arm=bpy.data.armatures.new('Island companion skeleton');rig=bpy.data.objects.new('Companion_Rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=arm.edit_bones.new(name);b.head=P(*head);b.tail=P(*tail)
 if parent:b.parent=arm.edit_bones[parent]
 return b
bone('Pelvis',(0,.84,0),(0,1.02,0));bone('Spine',(0,1.02,0),(0,1.52,0),'Pelvis');bone('Head',(0,1.57,0),(0,2.30,0),'Spine')
for side,tag in [(-1,'L'),(1,'R')]:
 bone('UpperArm.'+tag,(side*.35,1.46,0),(side*.42,1.19,.025),'Spine');bone('Forearm.'+tag,(side*.42,1.19,.025),(side*.26,1.055,.18),'UpperArm.'+tag);bone('Hand.'+tag,(side*.26,1.055,.18),(side*.19,1.01,.21),'Forearm.'+tag)
 bone('Thigh.'+tag,(side*.19,.88,0),(side*.19,.50,0),'Pelvis');bone('Shin.'+tag,(side*.19,.50,0),(side*.19,.19,0),'Thigh.'+tag);bone('Foot.'+tag,(side*.19,.19,0),(side*.19,.08,.18),'Shin.'+tag)
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
assets=list(dict.fromkeys(o for o in assets if o.name in bpy.data.objects))
for obj in assets:
 obj.parent=rig;m=obj.modifiers.new('Companion skin','ARMATURE');m.object=rig
 name=obj.get('bind_bone')
 if name:vg=obj.vertex_groups.new(name=name);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
for obj,upper,lower,hinge,width in limb_bind:
 a=obj.vertex_groups.new(name=upper);b=obj.vertex_groups.new(name=lower)
 for v in obj.data.vertices:
  z=(obj.matrix_world@v.co).z;t=max(0,min(1,(z-hinge+width)/(2*width)));t=t*t*(3-2*t)
  if t:a.add([v.index],t,'REPLACE')
  if t<1:b.add([v.index],1-t,'REPLACE')
# Two authored loops. These are baked into the GLB and crossfaded in Three.js.
rig.animation_data_create();bpy.context.scene.render.fps=30
for name,length in [('Idle',60),('Walk',32)]:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for f in range(1,length+2):
  phase=(f-1)/length*2*pi
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  if name=='Idle':
   rig.pose.bones['Spine'].scale=(1,1+.008*sin(phase),1);rig.pose.bones['Head'].rotation_euler[1]=.025*sin(phase)
  else:
   rig.pose.bones['Spine'].scale=(1,1,1);rig.pose.bones['Pelvis'].location[1]=.012*(1-cos(phase*2));rig.pose.bones['Spine'].rotation_euler[2]=.035*sin(phase);rig.pose.bones['Head'].rotation_euler[2]=-.025*sin(phase)
   for i,tag in enumerate(['L','R']):
    p=phase+i*pi;rig.pose.bones['Thigh.'+tag].rotation_euler[0]=.43*sin(p);rig.pose.bones['Shin.'+tag].rotation_euler[0]=.60*max(0,-sin(p));rig.pose.bones['Foot.'+tag].rotation_euler[0]=.12*sin(p);rig.pose.bones['UpperArm.'+tag].rotation_euler[0]=-.07*sin(p);rig.pose.bones['Forearm.'+tag].rotation_euler[0]=.07*sin(p)
  for pb in rig.pose.bones:
   pb.keyframe_insert(data_path='rotation_euler',frame=f);pb.keyframe_insert(data_path='location',frame=f);pb.keyframe_insert(data_path='scale',frame=f)
 rig.animation_data.action=None
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);track.mute=(name=='Walk')
# Export only the character, preserving source materials and skin weights.
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=61;bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in assets:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/hoodie-character.glb'),export_format='GLB',use_selection=True,export_skins=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_apply=False,export_yup=True)
# A Blender-native lighting setup remains in the source for further art direction.
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0));ground=bpy.context.object;ground.name='Studio ground (not exported)';ground.data.materials.append(mat('Studio ivory',(.72,.69,.60)))
def light(name,loc,energy,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Large warm key',(-3,-4,6),450,4);light('Soft fill',(4,-2,3),220,3);light('Hair rim',(1,3,4),350,3)
bpy.ops.object.camera_add(location=(1.8,-7,2.8));cam=bpy.context.object;cam.name='Character portrait';cam.rotation_euler=(Vector((0,0,1.25))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.10;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.world.color=(.3,.3,.3);scene.view_settings.view_transform='AgX'
# Source opens on the rig with idle active, in material-preview-ready framing.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':area.spaces.active.region_3d.view_distance=4;area.spaces.active.region_3d.view_location=Vector((0,0,1));area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'hoodie-character.blend'))
scene.render.filepath=os.path.join(OUT,'hoodie-character-render.png')
if not os.environ.get('FISHBOARD_SKIP_RENDER'):bpy.ops.render.render(write_still=True)
print('FISHBOARD_CHARACTER_COMPLETE',len(assets),os.path.getsize(os.path.join(ROOT,'public/models/hoodie-character.glb')))
