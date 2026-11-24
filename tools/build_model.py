"""Build an original educational reconstruction of CyberPi; not manufacturer CAD.

Run with Blender --background --python tools/build_model.py -- [project-root]
The manufacturer's drawing gives an overall 84 x 35 x 12.88 mm envelope.
Individual parts, internal electronics and all small dimensions are approximations.
No external images, CAD geometry, brand logo images, or texture assets are embedded.
"""
from pathlib import Path
import bpy
import json
import math
import sys
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
ROOT = Path(next((a for a in ARGS if not a.startswith("--")),str(Path(__file__).resolve().parents[1])))

def refine_existing():
    """Finish optical normals and render settings without rebuilding geometry."""
    scene=bpy.context.scene
    model=bpy.data.collections["CyberPi_Educational_Model"]
    for name in ("top_cover","bottom_cover"):
        obj=bpy.data.objects[name]
        for p in obj.data.polygons:
            p.use_smooth=False
        obj.data.update()
    bs=bpy.data.materials["Thin smoked top cover"].node_tree.nodes.get("Principled BSDF")
    bs.inputs["Specular IOR Level"].default_value=.02
    bs.inputs["Transmission Weight"].default_value=0
    bs.inputs["Roughness"].default_value=.14
    bs=bpy.data.materials["Amber polyimide LCD ribbon"].node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(.42,.15,.025,1)
    bs.inputs["Metallic"].default_value=0
    bs.inputs["Roughness"].default_value=.6
    obj=bpy.data.objects["lcd_flex_ribbon"]
    obj.dimensions.x=.0001
    obj.dimensions.z=.0016
    obj.location.z=.0063
    obj=bpy.data.objects["lcd_flex_upper_fold"]
    obj.dimensions.x=.0007
    obj.dimensions.z=.00006
    obj.location.x=.0155
    obj=bpy.data.objects["lcd_flex_lower_fold"]
    obj.dimensions.x=.0017
    obj.dimensions.z=.00006
    obj.location.x=.0167
    for obj in model.objects:
        if obj.name.startswith("case_mold_rib_"):
            obj.location.z=.0034
            obj.dimensions.z=.0056
        elif obj.name.startswith("case_internal_post_"):
            obj.location.z=.004
            obj.dimensions.z=.007
    bpy.data.objects["extension_connector"].location.z=.0015
    bpy.data.objects["extension_connector"].dimensions.z=.003
    scene.cycles.device="CPU"
    scene.cycles.samples=8
    scene.render.threads_mode="FIXED"
    scene.render.threads=6
    scene.render.resolution_x=960
    scene.render.resolution_y=600
    scene.render.resolution_percentage=100
    bpy.context.preferences.filepaths.save_version=0
    bpy.context.view_layer.update()
    cap=bpy.data.objects["button_b_cap"]
    v=[cap.matrix_world@p.co for p in cap.data.vertices]
    xmax=max(p.x for p in v)
    xmin=min(p.x for p in v)
    ytip=[p.y for p in v if p.x>xmax-.00025]
    yleft=[p.y for p in v if p.x<xmin+.00025]
    verification={"tip_side":"+X","world_x_min_m":xmin,"world_x_max_m":xmax,"tip_y_span_m":max(ytip)-min(ytip),"left_edge_y_span_m":max(yleft)-min(yleft)}
    assert verification["tip_y_span_m"]<verification["left_edge_y_span_m"],verification
    bpy.ops.object.select_all(action="DESELECT")
    for obj in model.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/"dist/assets/cyberpi-educational.glb"),export_format="GLB",use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=False,export_extras=True)
    scene.render.filepath=str(ROOT/"qa/model-render.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"models/CyberPi_educational.blend"),relative_remap=False)
    bpy.ops.render.render(write_still=True)
    for obj in model.objects:
        if obj.get("assembly_layer")=="top": obj.location.z+=.023
        elif obj.get("assembly_layer")=="bottom": obj.location.z-=.013
    bpy.data.objects["render_ground"].location.z=-.018
    camera=scene.camera
    camera.location=Vector((105,-145,78))*.001
    camera.rotation_euler=(Vector((0,0,8))*.001-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.ortho_scale=.142
    scene.render.filepath=str(ROOT/"qa/model-exploded.png")
    bpy.ops.render.render(write_still=True)
    metadata=json.loads((ROOT/"qa/model-metadata.json").read_text(encoding="utf-8"))
    metadata["render_backend"]="CPU, 6 threads"
    metadata["render_resolution"]=[960,600]
    metadata["render_samples"]=8
    metadata["button_b_direction_check"]=verification
    metadata["optical_finish"]="Flat cover normals; low-reflection non-refractive clear cover; narrow matte polyimide ribbon"
    (ROOT/"qa/model-metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding="utf-8")
    print("CYBERPI_FINAL_OK "+json.dumps(verification),flush=True)

if "--refine-existing" in ARGS:
    refine_existing()
    raise SystemExit(0)
for rel in ("models", "dist/assets", "qa"):
    (ROOT / rel).mkdir(parents=True, exist_ok=True)
MM = 0.001
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
if hasattr(bpy.context.preferences.filepaths, "use_save_preview_images"):
    bpy.context.preferences.filepaths.use_save_preview_images = False
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.length_unit = "MILLIMETERS"
scene.unit_settings.scale_length = 1.0
model = bpy.data.collections.new("CyberPi_Educational_Model")
scene.collection.children.link(model)
stage = bpy.data.collections.new("Render_Stage_Excluded_From_GLB")
scene.collection.children.link(stage)

def material(name, color, metallic=0, roughness=.35, alpha=1, transmission=0, emission=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color, alpha)
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, alpha)
    bs.inputs["Metallic"].default_value = metallic
    bs.inputs["Roughness"].default_value = roughness
    bs.inputs["Alpha"].default_value = alpha
    bs.inputs["Transmission Weight"].default_value = transmission
    bs.inputs["IOR"].default_value = 1.47
    if emission:
        bs.inputs["Emission Color"].default_value = (*emission[0], 1)
        bs.inputs["Emission Strength"].default_value = emission[1]
    if alpha < 1:
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "DITHERED"
        elif hasattr(m, "blend_method"):
            m.blend_method = "BLEND"
    return m

smoke = material("Smoked transparent polycarbonate", (.022,.029,.033), .04, .14, .63, .12)
top_smoke = material("Thin smoked top cover", (.028,.036,.039), .02, .09, .12, .08)
top_smoke.node_tree.nodes.get("Principled BSDF").inputs["Specular IOR Level"].default_value=.02
top_smoke.node_tree.nodes.get("Principled BSDF").inputs["Transmission Weight"].default_value=0
top_smoke.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value=.14
bottom = material("Graphite bottom", (.028,.037,.043), .25, .3)
pcbmat = material("Charcoal PCB", (.024,.044,.039), .08, .62)
silver = material("Pearl silver controls", (.74,.79,.82), .35, .23)
chrome = material("Polished rim", (.35,.43,.49), .8, .2)
rubber = material("Dark gasket", (.014,.020,.025), .03, .6)
black = material("Matte black electronics", (.022,.029,.033), .15, .53)
screenmat = material("Display black glass", (.001,.003,.004), .03, .26, emission=((.003,.014,.022),.04))
screenmat.node_tree.nodes.get("Principled BSDF").inputs["Specular IOR Level"].default_value=.18
white = material("Laser markings", (.65,.78,.83), .1, .38)
cyan = material("Display cyan", (.02,.65,.88), .05, .28, emission=((.02,.6,.85),.7))
gold = material("Brass contacts", (.63,.41,.11), .8, .3)
trace_mat = material("PCB masked copper traces", (.045,.095,.068), .35, .46)
ceramic = material("Ceramic SMD body", (.20,.16,.105), .1, .65)
flex_mat = material("Amber polyimide LCD ribbon", (.42,.15,.025), 0, .6)
tab_mat = material("Blue LCD protective tab", (.065,.055,.64), .05, .4)
diffuser_mat = material("Common translucent LED diffuser", (.64,.72,.76), .02, .3, .32, .12)
ledmats = [material(f"LED {i+1} independent", c, .05, .25, emission=(c,1.3)) for i,c in enumerate([(.03,.42,.8),(.03,.8,.62),(.35,.82,.16),(.95,.47,.04),(.85,.11,.28)])]

def into_collection(obj, col=model):
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    col.objects.link(obj)
    return obj

def finish(obj, name, mat, bevel=0, smooth=True):
    obj.name = name
    into_collection(obj)
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        mod.width = bevel * MM
        mod.segments = 4
        mod.affect = "EDGES"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
        try:
            wn = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
            wn.keep_sharp = True
            wn.weight = 50
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=wn.name)
        except Exception:
            pass
    obj["provenance"] = "Original educational reconstruction from published dimensions and component photographs"
    obj["dimension_status"] = "Approximate component geometry; not manufacturing CAD"
    return obj

def box(name, loc, dims, mat, bevel=.3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=Vector(loc)*MM)
    obj=bpy.context.object
    obj.dimensions=Vector(dims)*MM
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj,name,mat,bevel)

def cylinder(name, loc, radius, depth, mat, bevel=.15, rotation=(0,0,0), vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius*MM, depth=depth*MM, location=Vector(loc)*MM, rotation=rotation)
    obj=bpy.context.object
    return finish(obj,name,mat,bevel)

def rounded_loop(w,d,r,steps=10):
    pts=[]
    for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for i in range(steps+1):
            a=math.radians(start+i*90/steps)
            pts.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
    return pts

def frame(name,w,d,height,thickness,z,mat,radius=2.6):
    outer=rounded_loop(w,d,radius)
    inner=rounded_loop(w-2*thickness,d-2*thickness,max(radius-thickness,.25))
    n=len(outer)
    verts=[]
    for zz,ring in [(z-height/2,outer),(z+height/2,outer),(z-height/2,inner),(z+height/2,inner)]:
        verts.extend([(x*MM,y*MM,zz*MM) for x,y in ring])
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+j,2*n+i,3*n+i,3*n+j),(n+i,n+j,3*n+j,3*n+i),(j,i,2*n+i,2*n+j)])
    mesh=bpy.data.meshes.new(name+" mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    model.objects.link(obj)
    return finish(obj,name,mat,.12)

def text_mesh(name,text,loc,size,mat,rotation=(0,0,0),align="CENTER"):
    curve=bpy.data.curves.new(name+" type","FONT")
    curve.body=text
    curve.align_x=align
    curve.align_y="CENTER"
    curve.size=size*MM
    font_path=Path("C:/Windows/Fonts/segoeui.ttf")
    if font_path.exists():
        curve.font=bpy.data.fonts.get("Segoe UI") or bpy.data.fonts.load(str(font_path),check_existing=True)
    curve.extrude=.008*MM
    curve.bevel_depth=.004*MM
    obj=bpy.data.objects.new(name,curve)
    model.objects.link(obj)
    obj.location=Vector(loc)*MM
    obj.rotation_euler=rotation
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    obj.data.materials.append(mat)
    return obj

def triangle(name,loc,width,height,depth,mat):
    xy=[(-width/2,-height/2),(width/2,0),(-width/2,height/2)]
    verts=[(x*MM,y*MM,z*MM) for z in [-depth/2,depth/2] for x,y in xy]
    mesh=bpy.data.meshes.new(name+" mesh")
    mesh.from_pydata(verts,[],[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)])
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    model.objects.link(obj)
    obj.location=Vector(loc)*MM
    return finish(obj,name,mat,.65)

# Main envelope follows the official 84 x 35 x 12.88 mm dimension drawing.
frame("shell_bottom",84,35,2,1.25,1.0,smoke)
bottom_cover=box("bottom_cover",(0,0,.30),(81.5,32.5,.6),top_smoke,.2)
bottom_cut=box("temporary_bottom_connector_opening",(13,5,.5),(25.5,8.5,3),None,.4)
mod=bottom_cover.modifiers.new("Extension connector opening","BOOLEAN")
mod.operation="DIFFERENCE"
mod.object=bottom_cut
bpy.context.view_layer.objects.active=bottom_cover
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(bottom_cut,do_unlink=True)
for p in bottom_cover.data.polygons: p.use_smooth=False
shell=frame("shell_top",84,35,6.2,1.35,4.8,smoke)
side_cutters=[box("temporary_led_window",(-2,-17.3,4.5),(55,4,4),None,.4),
              box("temporary_speaker_window",(33,-17.3,4.7),(9.8,4,5.2),None,.5),
              box("temporary_usb_window",(42,-7.1,4.7),(4,10.1,4.25),None,.55),
              cylinder("temporary_home_window",(42,8.8,5.1),2.55,4,None,.1,rotation=(0,math.pi/2,0))]
for cutter in side_cutters:
    mod=shell.modifiers.new("Connector or light window","BOOLEAN")
    mod.operation="DIFFERENCE"
    mod.object=cutter
    bpy.context.view_layer.objects.active=shell
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
frame("case_seam",83.9,34.9,.4,.8,2.3,chrome)
box("pcb",(0,0,3.55),(80.8,31.8,1),pcbmat,.7)
cover=box("top_cover",(0,0,7.8),(81.3,32.3,.5),top_smoke,.2)
# Cut openings in the cover for the independently moving controls.
cutters=[cylinder("temporary_joystick_opening",(-28,-3,8),8.4,4,None,.1),
         box("temporary_a_opening",(27,8,8),(11.5,11.5,4),None,1.4),
         box("temporary_b_opening",(27,-8,8),(11.8,11.5,4),None,1.4)]
for cutter in cutters:
    mod=cover.modifiers.new("Component opening","BOOLEAN")
    mod.operation="DIFFERENCE"
    mod.object=cutter
    bpy.context.view_layer.objects.active=cover
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

# Screen bezel, separately named surface and procedural display lettering.
for p in cover.data.polygons: p.use_smooth=False
box("lcd_metal_backplate",(0,0,4.65),(30.8,30.8,.7),chrome,.45)
box("screen_bezel",(0,0,5.9),(30.8,30.8,2.6),black,.45)
box("screen_gasket",(0,0,7.16),(29.7,29.7,.3),rubber,.3)
box("screen_surface",(0,0,7.35),(27.8,27.8,.15),screenmat,.18)
text_mesh("screen_brand","makeblock",(0,5.4,7.45),3.15,cyan)
text_mesh("screen_title","cyberpi",(0,-1.4,7.45),6.3,white)
box("lcd_flex_ribbon",(15.8,0,6.3),(.1,19,1.6),flex_mat,.03)
box("lcd_flex_upper_fold",(15.5,0,7.15),(.7,19,.06),flex_mat,.02)
box("lcd_flex_lower_fold",(16.7,0,4.85),(1.7,19,.06),flex_mat,.02)
box("lcd_flex_connector",(18.5,0,4.7),(1.45,17.5,.85),black,.15)
for i in range(12):
    box(f"lcd_flex_trace_{i}",(17.2,-7.7+i*1.4,4.96),(2.4,.09,.03),gold,.01)
box("lcd_protective_tab",(12.0,-11.4,7.47),(2.7,2.5,.06),tab_mat,.08)

# Joystick: base, boot, silver cap, with clean individual control meshes.
cylinder("joystick_ring",(-28,-3,8.0),8.1,1.1,chrome,.35)
cylinder("joystick_boot",(-28,-3,8.85),6.9,1.4,rubber,.4)
cylinder("joystick_stem",(-28,-3,10),4.5,2.4,chrome,.5)
cylinder("joystick_cap",(-28,-3,11.33),6.45,3.1,silver,1.05)
for i,(x,y,a) in enumerate([(-28,6,math.pi/2),(-28,-12,-math.pi/2),(-37,-3,math.pi),(-19,-3,0)]):
    mark=triangle(f"joystick_direction_{i}",(x,y,8.15),1.2,1.5,.08,white)
    mark.rotation_euler[2]=a

box("button_a_base",(27,8,8.4),(11,11,1.6),rubber,1.9)
box("button_a_cap",(27,8,10),(8.8,8.8,2.8),silver,1.4)
triangle("button_b_base",(27,-8,8.5),12.2,12.2,1.6,rubber)
triangle("button_b_cap",(27,-8,10.0),9.2,9.2,2.8,silver)
text_mesh("label_a","A",(35,8,8.15),3.4,white)
text_mesh("label_b","B",(35,-8,8.15),3.4,white)

# On-board sensors above the joystick. These are illustrative exterior shapes.
for name,x in [("light_sensor",-31),("microphone",-23.7)]:
    cylinder(name+"_rim",(x,11,8.0),2.6,1.25,chrome,.3)
    cylinder(name,(x,11,8.75),1.55,.42,black,.1)
    if name=="microphone":
        for n in range(7):
            a=n*math.pi*2/7
            cylinder(f"mic_grille_{n}",(x+math.cos(a)*.85,11+math.sin(a)*.85,9.0),.16,.08,rubber,.02,vertices=12)
    else:
        cylinder("light_sensor_lens",(x,11,9.04),.8,.13,cyan,.07)

# Five individually controllable front-facing RGB LED lenses.
box("led_strip_backing",(-2,-16.6,4.5),(54.8,1.1,3.4),rubber,.45)
box("led_strip_frame",(-2,-17.0,4.5),(54.6,.45,2.9),chrome,.35)
for i,x in enumerate([-23,-12.5,-2,8.5,19]):
    box(f"led_{i+1}",(x,-17.15,4.5),(9.7,.35,1.8),ledmats[i],.25)
box("led_strip_diffuser",(-2,-17.35,4.5),(54.2,.25,2.5),diffuser_mat,.35)

# Side controls and connectors. Metal shells surround dark visible cavities.
cylinder("home_button_rim",(41.3,8.8,5.1),2.35,.8,chrome,.2,rotation=(0,math.pi/2,0))
cylinder("home_button",(41.65,8.8,5.1),1.78,.6,silver,.2,rotation=(0,math.pi/2,0))
box("usb_port",(41.5,-7.1,4.7),(.65,9.4,3.7),chrome,.65)
box("usb_port_cavity",(41.85,-7.1,4.7),(.08,7.9,2.5),rubber,.5)
box("usb_port_tongue",(41.94,-7.1,4.7),(.08,5.7,.5),black,.15)
box("usb_shield_body",(38.7,-7.1,4.7),(5.6,9.0,3.3),chrome,.55)
for i in range(4):
    box(f"usb_shell_tab_{i}",(37.0+(i//2)*2.8,-7.1+(-1 if i%2 else 1)*4.4,4.0),(1.1,.8,.35),chrome,.12)
box("white_board_connector",(36.4,2.0,5.7),(4.2,4.9,3.2),silver,.28)
box("white_connector_opening",(36.4,2.0,7.34),(2.7,3.4,.1),black,.12)
box("mbuild_port",(25,17.0,4.6),(10,1.0,4.6),black,.5)
box("mbuild_port_cavity",(25,17.35,4.6),(7.7,.18,2.8),rubber,.2)
for i in range(4):
    box(f"mbuild_contact_{i}",(22.7+i*1.5,17.42,4.6),(.4,.15,1.6),gold,.04)
box("speaker",(33,-16.7,4.7),(9.2,1.4,5.0),black,.7)
for i in range(5):
    box(f"speaker_grille_{i}",(30+i*1.5,-17.44,4.7),(.42,.12,3.3),chrome,.15)
text_mesh("front_case_wordmark","CyberPi",(-35.5,-17.51,4.6),1.65,white,rotation=(math.pi/2,0,0))

# Visible internal detail is representative, deliberately not circuit-accurate.
for i,(x,y,sx,sy) in enumerate([(-35,12,6,3),(-20,8,3,3),(20,0,4,6),(34,0,5,4),(-34,-13,6,2),(10,13,5,2),(-9,13,4,2)]):
    box(f"illustrative_chip_{i}",(x,y,4.55),(sx,sy,1),black,.18)
    for j in range(3):
        box(f"illustrative_pin_{i}_{j}",(x-sx/2+.7+j*.8,y-sy/2-.4,4.4),(.35,.8,.3),chrome,.04)
for i in range(13):
    box(f"illustrative_component_{i}",(-18.5,-12+i*1.9,4.7),(1.1,.7,.65),silver,.12)
for i,(x,y) in enumerate([(-38.4,-13.7),(38.4,-13.7),(-38.4,13.7),(38.4,13.7)]):
    cylinder(f"case_internal_post_{i}",(x,y,4.0),1.6,7.0,smoke,.15,vertices=32)
    cylinder(f"case_fastener_{i}",(x,y,7.9),.72,.22,black,.09,vertices=32)
    box(f"screw_slot_{i}",(x,y,8.025),(.75,.13,.025),chrome,.02)
box("extension_connector",(13,5,1.5),(24,7,3.0),black,.35)
for i in range(14):
    box(f"extension_contact_{i}",(2+i*1.6,5,.065),(.7,3,.13),gold,.05)

# More legible electronics beneath the transparent cover. These are visual
# reconstructions only: component count and routing are not an electrical design.
smd_positions=[(-37,10),(-36,6),(-37,-10),(-33,-13),(-27,-13),(-21,-13),(-18,12),(-18,8),(-18,-9),(19,13),(24,13),(31,13),(37,11),(37,4),(37,-3),(37,-10),(21,-14),(27,-14),(34,-13)]
for i,(x,y) in enumerate(smd_positions):
    sx=1.7 if i%3 else 2.2
    sy=.85 if i%2 else 1.15
    box(f"smd_{i}_body",(x,y,4.7),(sx,sy,.6),ceramic if i%4==0 else black,.09)
    for j,sign in enumerate([-1,1]):
        box(f"smd_{i}_terminal_{j}",(x+sign*(sx/2+.12),y,4.72),(.35,sy+.08,.62),chrome,.06)
for i,x in enumerate([-38,-35,-32,-29,-26,-23,-20,19,22,25,28,31,34,37]):
    for sign in [-1,1]:
        y=sign*(12.3+(i%3)*.5)
        box(f"pcb_trace_{i}_{sign}_a",(x,y,4.062),(.13,3.2,.025),trace_mat,.015)
        box(f"pcb_trace_{i}_{sign}_b",(x+1.1,y-sign*1.6,4.062),(2.3,.13,.025),trace_mat,.015)
for i,(x,y) in enumerate([(-36,-8),(-35,9),(-20,12),(19,12),(35,-12),(37,1)]):
    cylinder(f"pcb_test_pad_{i}",(x,y,4.09),.45,.06,gold,.02,vertices=24)

# A back-facing shield can, antenna and auxiliary ICs, visible through the base.
# Their geometry is inferred from product photos, not from a circuit drawing.
box("esp32_module_pcb",(-26,0,2.5),(21,26,1),pcbmat,.35)
box("esp32_shield_can",(-26,-2.0,1.72),(17.6,18.5,1.2),chrome,.45)
text_mesh("esp32_back_label","ESP32",(-26,-2.0,1.095),2.35,black,rotation=(math.pi,0,0))
box("esp32_antenna_region",(-26,10.2,1.9),(17.6,4.8,.8),black,.15)
for i in range(6):
    box(f"antenna_trace_{i}",(-33+i*2.5,10.2,1.45),(.35,3.5,.09),gold,.03)
box("antenna_trace_bus",(-26,11.7,1.45),(14.4,.35,.09),gold,.03)
for i,(x,y,sx,sy) in enumerate([(28,-8,8,6),(9,-7,9,8),(30,10,5,4),(-4,8,5,6)]):
    box(f"back_ic_{i}",(x,y,2.0),(sx,sy,1.6),black,.2)
    for j in range(4):
        for sign in [-1,1]:
            box(f"back_ic_{i}_pin_{j}_{sign}",(x-sx/2+.8+j*1.2,y+sign*(sy/2+.5),2.2),(.4,1,.4),chrome,.04)
for i,(x,y) in enumerate([(-38,0),(38,0)]):
    cylinder(f"structural_socket_rim_{i}",(x,y,1.05),2.15,1.9,smoke,.18,vertices=40)
    cylinder(f"structural_socket_recess_{i}",(x,y,.08),1.25,.13,black,.05,vertices=40)
for i,x in enumerate([-37,-19,18,37]):
    box(f"case_mold_rib_{i}",(x,0,3.4),(.5,29,5.6),smoke,.15)

# Assembly layers retain all component names while enabling a coherent three-part
# exploded view in the browser and in the comparison render.
top_names={"shell_top","top_cover","case_seam","label_a","label_b","front_case_wordmark"}
bottom_names={"shell_bottom","bottom_cover"}
layers={"top":[],"core":[],"bottom":[]}
for obj in model.objects:
    if obj.name in top_names or obj.name.startswith(("joystick_direction_","case_fastener_","screw_slot_")):
        layer="top"
    elif obj.name in bottom_names or obj.name.startswith(("case_internal_post_","case_mold_rib_","structural_socket_")):
        layer="bottom"
    else:
        layer="core"
    obj["assembly_layer"]=layer
    layers[layer].append(obj.name)

# Export model meshes only, in meters. Cameras and stage remain in the .blend.
bpy.ops.object.select_all(action="DESELECT")
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.update()
required=["button_a_cap","button_b_cap","joystick_cap","screen_surface",*[f"led_{i}" for i in range(1,6)],"usb_port","home_button","light_sensor","microphone","speaker","shell_top","shell_bottom","pcb"]
missing=[name for name in required if bpy.data.objects.get(name) is None]
assert not missing,missing
glb_path=ROOT/"dist/assets/cyberpi-educational.glb"
bpy.ops.export_scene.gltf(filepath=str(glb_path),export_format="GLB",use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=False,export_extras=True)

# A restrained product render, with enough elevation to inspect the screen and LEDs.
floor=box("render_ground",(0,0,-1.2),(650,650,.5),material("Studio floor",(.026,.047,.065),.05,.42),.1)
into_collection(floor,stage)
world=bpy.data.worlds.new("Studio world") if not scene.world else scene.world
scene.world=world
world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(.15,.21,.3,1)
world.node_tree.nodes["Background"].inputs[1].default_value=.45

def light(name,loc,power,size,color):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=power
    data.shape="DISK"
    data.size=size*MM
    data.color=color
    obj=bpy.data.objects.new(name,data)
    stage.objects.link(obj)
    obj.location=Vector(loc)*MM
    obj.rotation_euler=(Vector((0,0,.005))-obj.location).to_track_quat("-Z","Y").to_euler()
    return obj

light("Large key",(-50,-60,110),.22,90,(.82,.92,1))
light("Soft fill",(60,-15,60),.095,65,(.64,.83,1))
light("Back rim",(10,60,70),.25,65,(.45,.75,1))
camdata=bpy.data.cameras.new("Product camera")
camera=bpy.data.objects.new("Product camera",camdata)
stage.objects.link(camera)
camera.location=Vector((94,-128,118))*MM
camera.rotation_euler=(Vector((0,0,4))*MM-camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.type="ORTHO"
camera.data.ortho_scale=.120
camera.data.lens=50
camera.data.clip_start=.001
camera.data.clip_end=10
scene.camera=camera
scene.render.engine="CYCLES"
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.cycles.device="CPU"
render_backend="CPU"
# CPU is the reproducible default: the installed OptiX runtime reported an
# unsupported PTX intrinsic during validation. No driver or user setting changes.
scene.render.resolution_x=1440
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.threads_mode="FIXED"
scene.render.threads=6
scene.render.image_settings.file_format="PNG"
scene.render.filepath=str(ROOT/"qa/model-render.png")
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"

points=[o.matrix_world@Vector(c) for o in model.objects if o.type=="MESH" for c in o.bound_box]
minimum=[min(v[i] for v in points) for i in range(3)]
maximum=[max(v[i] for v in points) for i in range(3)]
metadata={
    "title":"CyberPi educational reconstruction",
    "provenance":"Original geometry made from official product dimensions and labeled photographs. Not a downloaded manufacturer CAD model and not reconstructed from video frames.",
    "reference_image":"source/official-components.png",
    "reference_dimension_image":"source/official-dimensions.png",
    "commercial_preview_reference":"source/commercial-preview-sketchfab.jpg; public preview only, not extracted paid geometry",
    "reference_dimensions_mm":{"width":84,"depth":35,"height":12.88},
    "dimension_status":"Published overall dimensions used as reference. Component dimensions, placement, connectors and internal electronics are approximate; not intended for manufacturing or physical fit.",
    "blender_version":bpy.app.version_string,
    "glb_units":"meters",
    "blender_axes":{"x":"left to right","y":"back","z":"up"},
    "gltf_axes":{"x":"left to right","y":"up","z":"front LED edge"},
    "mesh_count":sum(o.type=="MESH" for o in model.objects),
    "assembly_layers":layers,
    "button_b_direction_blender":"+X (right)",
    "render_backend":render_backend,
    "required_nodes":required,
    "nodes":[o.name for o in model.objects],
    "bounds_blender_m":{"min":minimum,"max":maximum,"size":[maximum[i]-minimum[i] for i in range(3)]},
    "export_excludes":["render_ground","camera","lights"],
    "output":"dist/assets/cyberpi-educational.glb",
    "materials_note":"Shell transparency and LED emission may differ between Blender and the browser. LED material slots are independent for live demonstrations."
}
(ROOT/"qa/model-metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding="utf-8")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"models/CyberPi_educational.blend"),relative_remap=False)
try:
    bpy.ops.render.render(write_still=True)
except RuntimeError:
    scene.cycles.device="CPU"
    render_backend="CPU fallback"
    bpy.ops.render.render(write_still=True)
for obj in model.objects:
    if obj.get("assembly_layer")=="top":
        obj.location.z += .023
    elif obj.get("assembly_layer")=="bottom":
        obj.location.z -= .013
floor.location.z=-.018
camera.location=Vector((105,-145,78))*MM
camera.rotation_euler=(Vector((0,0,8))*MM-camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.ortho_scale=.142
scene.render.filepath=str(ROOT/"qa/model-exploded.png")
bpy.ops.render.render(write_still=True)
metadata["render_backend"]=render_backend
metadata["render_checks"]={"assembled":"qa/model-render.png","exploded":"qa/model-exploded.png"}
(ROOT/"qa/model-metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding="utf-8")
print("CYBERPI_BUILD_OK "+json.dumps({"glb":str(glb_path),"mesh_count":metadata["mesh_count"],"bounds_m":metadata["bounds_blender_m"]["size"],"required_nodes":len(required)}))
