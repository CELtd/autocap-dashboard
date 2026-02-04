## What is AutoCap?

Under the current Filecoin Plus (FIL+) model, DataCap is typically allocated through a **permission-first process**.

A client applies to a DataCap Allocator, the allocator verifies the client's dataset off-chain, and DataCap is granted upfront. The client then uses that DataCap to make verified storage deals with Storage Providers, who benefit indirectly through the verified deal power multiplier.

AutoCap pivots this logic.

Instead of requesting DataCap in advance, participants **prove real, verifiable economic activity on-chain first**, and DataCap is distributed automatically as a reward.

AutoCap is a **round-based DataCap allocation system** that rewards participants proportionally to their contribution to the Filecoin network, measured by **FIL burned through the settlement of Filecoin Pay rails**.

Each round defines a fixed amount of DataCap to distribute. Participants who generate FIL burns during the round receive a share of that DataCap proportional to their contribution relative to other participants.

Conceptually, AutoCap retains DataCap as the incentive, but changes the proxy for value:
- In the traditional FIL+ flow, value is inferred through **prior verification and approval**
- In AutoCap, value is measured through **observable, on-chain economic contribution**

This results in an **action-first, reward-later** model, where allocation is derived from behavior rather than permission.
