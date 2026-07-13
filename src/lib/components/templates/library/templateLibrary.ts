export const templateLibrary = [

{
id:1,
category:"Production",
name:"Daily Production Report",
icon:"🏭",
description:"Daily production monitoring",
fields:[
"Machine Name",
"Model",
"Shift",
"Operator",
"Target",
"Actual",
"UPH",
"Efficiency",
"Remarks"
]
},

{
id:2,
category:"Production",
name:"Hourly Production Report",
icon:"⏰",
description:"Hourly production tracking",
fields:[
"Hour",
"Machine",
"Target",
"Actual",
"Loss Time",
"Reason"
]
},

{
id:3,
category:"Quality",
name:"Quality Inspection",
icon:"✅",
description:"Quality audit checklist",
fields:[
"Lot Number",
"Machine",
"Inspector",
"OK Qty",
"NG Qty",
"Remarks"
]
},

{
id:4,
category:"Maintenance",
name:"Machine Breakdown",
icon:"🛠",
description:"Machine failure report",
fields:[
"Machine",
"Problem",
"Start Time",
"End Time",
"Engineer",
"Root Cause",
"Action"
]
},

{
id:5,
category:"Safety",
name:"Safety Audit",
icon:"🦺",
description:"Safety inspection",
fields:[
"Department",
"Area",
"Issue",
"Risk",
"Corrective Action"
]
}

];