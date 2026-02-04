# How Does AutoCap Work?

AutoCap operates in **discrete allocation rounds**. Each round defines a self-contained accounting period during which economic activity is measured and DataCap is distributed.

Each round is parameterized by:

* A fixed **start time** and **end time**
* A **registration fee**, paid in FIL
* A fixed **total DataCap pool** to be allocated at the end of the round

### Rounds

The round lifecycle consists of **three** protocol **phases**:

1. **Registration ;**
2. **Contribution;**
3. **Allocation** and **Distribution.**

Throughout the round, AutoCap provides continuous, real-time observability into contributions and provisional allocations via the dashboard.

Rounds are independent from one another. Activity in one round does not carry over to the next, and participants must explicitly register for each round they wish to participate in.

This design ensures:

* Clear accounting boundaries
* Deterministic allocation outcomes
* No retroactive effects across rounds
