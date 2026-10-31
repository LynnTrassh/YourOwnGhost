// Explicit authored study of the actual room-1 I-shaped room. No random stream.
const side=(id,side,z,y,scale,roll,cluster,dz=-.25)=>({id,position:[side*2.49,y,z],direction:[-side,0,dz],scale,roll,cluster,
  mount:{axis:'X',plane:side*2.41,sign:-side,start:-17.4,end:-12.6}});
const shoulder=(id,x,y,scale,roll)=>({id,position:[x,y,-17.49],direction:[0,0,-1],scale,roll,cluster:'reverse-reveal',
  mount:{axis:'Z',plane:-17.59,sign:-1,start:x<0?-7.4:2.6,end:x<0?-2.6:7.4}});
export const HAND_COMPOSITIONS={
  convergence:[
    side('near-l',-1,-13.05,1.55,.52,-.25,'sparse',0),side('near-r',1,-13.8,1.85,.52,.3,'sparse',0),
    side('mid-l-low',-1,-14.4,1.4,.52,.2,'growing',0),side('mid-r-high',1,-14.55,2.5,.9,-.35,'growing'),
    side('mid-l-high',-1,-14.8,2.5,.95,.3,'growing'),side('mid-r-low',1,-15.15,1.45,.52,-.2,'growing',0),
    side('peak-l-a',-1,-15.65,2.5,1.05,-.3,'peak'),side('peak-r-a',1,-15.8,2.55,1.1,.2,'peak'),
    side('peak-l-b',-1,-16.4,2.45,1.1,.25,'peak'),side('peak-r-b',1,-16.5,2.5,1.05,-.3,'peak'),
    side('peak-l-low',-1,-16.6,1.55,.52,.3,'peak',0),side('peak-r-low',1,-16.8,1.6,.52,-.2,'peak',0),
  ],
  reverse:[
    side('near-l',-1,-13.05,1.55,.52,-.25,'sparse',0),side('near-r',1,-13.8,1.85,.52,.3,'sparse',0),
    side('mid-l-high',-1,-14.8,2.5,.95,.3,'visible',.25),side('mid-r-high',1,-14.55,2.5,.9,-.35,'visible',.25),
    side('mid-l-low',-1,-15.6,1.5,.52,.3,'visible',0),side('mid-r-low',1,-15.7,1.55,.52,-.2,'visible',0),
    shoulder('reverse-la',-3.15,1.6,.95,-.3),shoulder('reverse-lb',-3.65,2.35,1.05,.2),shoulder('reverse-lc',-4.2,1.6,.85,.4),
    shoulder('reverse-ra',3.15,2.35,1.05,-.3),shoulder('reverse-rb',3.75,1.6,.95,.3),shoulder('reverse-rc',4.35,2.35,.85,-.3),
  ],
};
