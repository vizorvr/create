#Triangle

##Description
Triangle oscillator. A **time** value incrementing by one per second yields a 1Hz output signal.

##Inputs
###time
The current **time** in seconds.

##Outputs
###value
Emits ((0.5 - |(**time** % 1.0) - 0.5|) - 0.25) * 4.

##Detail

