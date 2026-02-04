---
description: Burn FIL Through Filecoin Pay
---

# 2. Contribution

During an active round, registered participants generate economic contribution by **burning FIL through the settlement of** [**Filecoin Pay**](https://pay.filecoin.cloud) **payment rails**.

AutoCap does not track generic payments or transfers. It observes **finalized Filecoin Pay settlement events** that result in FIL being burned on-chain and originate from a registered **Participant Address**.

**Settlement and FIL Burns**

Filecoin Pay supports programmable payment rails that accumulate obligations over time.\
FIL is **not burned continuously**, but rather **at settlement**, when accumulated obligations are finalized on-chain.

Only FIL that is:

* Burned as a direct result of **rail settlement**
* Finalized on-chain
* Denominated in FIL
* Originating from a registered Participant Address
* Occurring within the round window

is counted toward AutoCap’s accounting.

Unsettled rails, pending obligations, or reverted settlements are not included.

