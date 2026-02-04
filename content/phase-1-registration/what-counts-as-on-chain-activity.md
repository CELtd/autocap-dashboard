# What Counts as On-Chain Activity

For the purposes of AutoCap, _on-chain activity_ is defined narrowly and precisely.

AutoCap measures **FIL burned by a registered Participant Address as a result of Filecoin Pay rail settlements**, subject to the following conditions:

* The burn originates from a **registered Participant Address**
* The burn results from the **settlement of a Filecoin Pay payment rail**
* The settlement is **denominated in FIL**
* The settlement is **finalized on-chain**
* The settlement occurs **within the start and end time of the round**

Only FIL that is **actually burned as part of settlement** is counted toward a participant's contribution.

The following do **not** count as on-chain activity for AutoCap:

* Unsettled Filecoin Pay rails
* Payments or transfers that do not result in FIL burn
* Activity originating from non-registered addresses
* Activity occurring outside the round window
* Activity denominated in assets other than FIL

> **Note on Future Refinements**
>
> Future versions of AutoCap may refine this measurement to count only Filecoin Pay settlements that can be **directly linked to sealed storage sectors (PoRep-backed storage deals)**.
