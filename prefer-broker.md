If a broker is preferred, a reference to this broker should be saved in persistent memory.

On startup it should be loaded again And displayed in the scanner view as preferred.

Apparently this does not persist.

Lay out the plan and ask any questions if I'm unclear


On startup, the persisted broker now is displayed as preferred. However, it has status "Not found".
This should be fixed by a short mDNS scan for that broker, filling in the IP address and so forth.
Lay out the plan and ask any questions if I'm unclear

I think we should modify the plan and drop the auto scan button completely And move the Start Scan button to the top. This should scan for an appropriate period, like up to five seconds.
This scan could also be triggered on startup when the preferred broker is retrieved but still indicated as not found.

The preferred broker reloads properly and the initial scan is started. However, when the initial scan stops, the preferred broker car still reverts to the not found label.


A manually added broker is not subject to MDNS resolution. It comes up as not found. The initial scan starts and it remains not found. Maybe the manual brokers should get a different state, namely manual and yellow background.
It should also honor immediate auto-connect without resolution.