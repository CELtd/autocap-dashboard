# 1. Registration

![Screenshot 2026-01-12 125319](https://hackmd.io/_uploads/Skl0xDGSZe.png)

When a round opens, participants can register through the AutoCap Dashboard by:

* Connecting a Filecoin-compatible wallet _(this wallet becomes the **Participant Address** tracked for on-chain activity)_
* Paying the registration fee from that wallet
* Providing a **DataCap Actor ID** (`f0xxx`) where any allocated DataCap will be sent

Registration establishes the binding between measured on-chain activity and the DataCap recipient for the round.

**Important:** Registration defines two distinct address roles:

* **Participant Address (wallet address)** This is the address from which **on-chain activity is measured**. Only activity originating from this address is counted toward the round.
* **DataCap Actor ID (`f0xxx`)** This is the address that receives the DataCap allocation at the end of the round. It is not used for activity measurement.

Each Participant Address may register **at most once per round**.
