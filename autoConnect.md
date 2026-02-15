My plan is to implement automatic scanning and connection to a preferred broker on startup.

Step one is to implement a preferred broker

in the Scanner View Page add a switch 'Auto Scan' at the top. Start DNS scanning automatically if that button is selected. And persistent.
in the Scanner View Page add a button 'Auto Connect' at the top. grey it out if no preferred broker is set.

in the Scanner View Page add a button 'Prefered' Besides each 'tap to connect' button.

There can only be one preferred broker.

Show the preferred broker attribute above the scan results.

add a button to clear the preferred broker attribute besides the previous field.

discuss how the mDNS announcement can be stored effectively to find broker instance.


Match a scan result against the preferred broker by comparing instance name and the port.