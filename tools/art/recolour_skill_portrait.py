# Recolours a skill portrait from one attribute pigment to another (black + cream + pigment unmixing).
# Usage: python3 tools/art/recolour_skill_portrait.py <out-dir>  (Skeleton 2.0: analysis -> Perception teal, proficiency -> Expression petrol)
import sys,numpy as np,colorsys
from PIL import Image
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float64)/255
def endmembers(im):
    px=im.reshape(-1,3); mx=px.max(1); mn=px.min(1); sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    # cream: bright, low-ish saturation; pigment: saturated and not cream-hued (r is not the max channel)
    cream=px[(mx>0.85)&(sat<0.35)]; cream=np.median(cream,0)
    pig=px[(sat>0.45)&(mx>0.12)&(px[:,0]<px[:,1])]
    lum=pig.sum(1); top=pig[lum>=np.percentile(lum,85)]
    return cream,np.median(top,0),len(pig)
def recolor(src,dst_pig,out):
    im=load(src); cream,pig,n=endmembers(im)
    A=np.stack([cream,pig],1)                    # 3x2
    px=im.reshape(-1,3)
    co,_,_,_=np.linalg.lstsq(A,px.T,rcond=None); co=co.T
    co=np.clip(co,0,None)
    # refit the pixels where one coefficient was clipped
    fit=co@A.T; res=px-fit
    B=np.stack([cream,dst_pig],1)
    new=co@B.T+res*(co[:,1:2]<0.05)              # keep the residual only where there is no pigment (cream texture, black)
    new=np.clip(new,0,1).reshape(im.shape)
    Image.fromarray((new*255+0.5).astype(np.uint8)).save(out)
    return cream,pig,n
a='art/icons/skills/analysis.png'; b='art/icons/skills/proficiency.png'
_,pa,_=endmembers(load(a)); _,pb,_=endmembers(load(b))
print('petrol',(pa*255).round(),'teal',(pb*255).round())
recolor(a,pb,sys.argv[1]+'/analysis-teal.png'); recolor(b,pa,sys.argv[1]+'/proficiency-petrol.png')
x=Image.open(sys.argv[1]+'/analysis-teal.png').resize((400,500)); y=Image.open(sys.argv[1]+'/proficiency-petrol.png').resize((400,500))
sh=Image.new('RGB',(800,500)); sh.paste(x,(0,0)); sh.paste(y,(400,0)); sh.save(sys.argv[1]+'/two-new.jpg',quality=88)
