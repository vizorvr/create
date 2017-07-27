#Depth Material

##Description
THREE.js Mesh Depth Material

##Inputs
###wireframe


###opacity
Float in the range of **0.0** to **1.0**, indicating how transparent the material is. A value of **0.0** indicates fully transparent, **1.0** is fully opaque. If transparent is not set to **True** for the material, the material will remain fully opaque and this value will only affect its color.

###transparent
Defines whether this material is transparent. When set to **True**, the extent to which the material is transparent is controlled by setting **opacity**.

###blending
Which blending to use when displaying objects with this material. Default is **Normal** (**1**).<br>
**0** = No
**1** = Normal
**2** = Additive
**3** = Subtractive
**4** = Multiply
**5** = Custom

###side
Defines which of the face sides will be rendered - front, back or both.<br>
**0** = Front
**1** = Back
**2** = Double Sided

##Outputs
###material


##Detail

