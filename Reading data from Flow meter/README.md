# 📘 ECO-OVAL Flowmeter Pulse Output and ADAM-6251 Counter Notes

This README summarizes the key points discussed about using an ECO-OVAL flowmeter pulse output with an Advantech ADAM-6251 digital input counter.

## 1. 🔢 ADAM Counter Mode

When an ADAM-6251 digital input channel is set to `Counter` mode, the ADAM counts incoming pulses.

The ADAM counter value is only a pulse count:

```text
Counter value = number of pulses
```

It does not automatically know liters, L/min, or m3/h. Those values must be calculated using the flowmeter pulse factor.

📌 Example:

```text
Flowmeter setting: 1 L/P
ADAM counter:      60 pulses in 1 minute
```

✅ Result:

```text
Total volume = 60 pulses x 1 L/P = 60 L
Frequency    = 60 pulses / 60 seconds = 1 Hz
Flow rate    = 60 L/min
```

## 2. 📏 Pulse Factor

`L/P` means liters per pulse.

Examples:

```text
100 mL/P = 0.1 L per pulse
1 L/P    = 1 L per pulse
10 L/P   = 10 L per pulse
```

If the ECO-OVAL is set to `1 L/P`, every pulse received by ADAM means 1 liter has passed through the flowmeter.

## 3. 🧮 Flow Calculation From ADAM Counter

Use the change in counter value over time.

```text
Delta pulse = New counter value - Old counter value
```

Total volume:

```text
Volume L = Counter value x Pulse factor L/P
```

Flow rate:

```text
Flow L/min = Delta pulse x Pulse factor L/P x 60 / Delta time seconds
```

Frequency:

```text
Frequency Hz = Delta pulse / Delta time seconds
```

Flow from frequency:

```text
Flow L/min = Frequency Hz x Pulse factor L/P x 60
Flow m3/h  = Frequency Hz x Pulse factor L/P x 3.6
```

📌 Example with 10 second sampling:

```text
Old counter = 500
New counter = 512
Delta pulse = 12 pulses
Pulse factor = 1 L/P
Delta time = 10 seconds
```

```text
Flow L/min = 12 x 1 x 60 / 10
           = 72 L/min
```

## 4. ⏱️ ECO-OVAL Factored Pulse Width

The ECO-OVAL factored pulse width is the ON-time of each output pulse.

Selectable values:

```text
1 ms
50 ms
100 ms
250 ms
```

📌 Example:

```text
1 ms pulse   = output ON for 1 ms, then OFF
50 ms pulse  = output ON for 50 ms, then OFF
100 ms pulse = output ON for 100 ms, then OFF
250 ms pulse = output ON for 250 ms, then OFF
```

This is not the flow rate. It is only the pulse duration.

The ECO-OVAL output is an open collector pulse output. The catalog specification shows:

```text
Output type:       Open collector pulse
Allowable current: 20 mA DC max
Applied voltage:   30 VDC max
```

For ADAM-6251, use a 24 VDC wet input arrangement and do not exceed the input/output voltage limits.

## 5. ✅ ADAM-6251 Suitability

The ADAM-6251 is suitable for the ECO-OVAL pulse output when wired and configured correctly.

Relevant ADAM-6251 input specifications:

```text
Wet contact logic 0: 0 to 3 VDC
Wet contact logic 1: 10 to 30 VDC
Input impedance:     5.2 kOhm
Transition time:     0.2 ms
Frequency range:     0.1 to 3 kHz
Counter input:       3 kHz
```

The ECO-OVAL pulse frequencies in the table are much lower than 3 kHz, so the ADAM counter speed is more than enough.

## 6. 🧹 ADAM Digital Filter

The ADAM digital filter has:

```text
Minimum low signal width
Minimum high signal width
```

These settings filter short noise pulses.

The setting unit shown in the ADAM utility is:

```text
1 count = 0.1 ms
```

Examples:

```text
Setting 1    = 0.1 ms
Setting 10   = 1 ms
Setting 100  = 10 ms
Setting 1000 = 100 ms
```

Minimum high signal width:

```text
The signal must stay HIGH for at least this long before ADAM accepts it.
```

Minimum low signal width:

```text
The signal must stay LOW for at least this long before ADAM accepts it.
```

⚠️ Important:

If the ECO-OVAL pulse width is `1 ms`, the ADAM minimum high signal width must be less than 1 ms.

✅ Recommended starting filter for 1 ms pulses:

```text
Minimum high width = 0.1 to 0.5 ms
Minimum low width  = 0.1 to 0.5 ms
```

If the ADAM filter is set too high, valid flowmeter pulses can be ignored.

## 7. 📊 ECO-OVAL Meter Size 53 Table Explanation

For meter size `53`, the table shows these factored pulse options:

| Factored pulse | Max output frequency | Allowed pulse width |
|---:|---:|---|
| 100 mL/P | 17.7 Hz | 1 ms only |
| 1 L/P | 1.77 Hz | 1 ms, 50 ms, 100 ms, 250 ms |
| 10 L/P | 0.17 Hz | 1 ms, 50 ms, 100 ms, 250 ms |

📌 Meaning:

```text
100 mL/P = 1 pulse per 0.1 L
1 L/P    = 1 pulse per 1 L
10 L/P   = 1 pulse per 10 L
```

The right side of the table also shows the unfactored pulse:

```text
Unfactored pulse factor = 17.470 mL/P
Unfactored max output frequency = 101.8 Hz
```

Unfactored pulse gives higher resolution, but more pulses.

## 8. 📡 Meaning of Output Freq.

`Output Freq.` is the maximum pulse frequency from the flowmeter at maximum flow for the selected pulse factor.

Formula:

```text
Output frequency Hz = Flow rate / Pulse factor
```

Or:

```text
Flow rate = Output frequency x Pulse factor
```

For meter size 53:

```text
100 mL/P -> 17.7 Hz
1 L/P    -> 1.77 Hz
10 L/P   -> 0.17 Hz
```

These represent the same maximum flow, but with different pulse resolutions.

📌 Example for `1 L/P`:

```text
Output Freq. = 1.77 Hz
Pulse factor = 1 L/P
```

```text
Flow = 1.77 P/s x 1 L/P
     = 1.77 L/s
     = 106.2 L/min
     = 6.372 m3/h
```

If the ADAM measures only `1 Hz`:

```text
Flow = 1 P/s x 1 L/P
     = 1 L/s
     = 60 L/min
     = 3.6 m3/h
```

🧭 Output frequency is used to:

1. Check if ADAM/PLC can count the pulse speed.
2. Choose a suitable pulse width.
3. Calculate flow rate from measured pulse frequency.

## 9. ⏲️ Pulse Width Versus Output Frequency

Pulse width must fit inside the pulse cycle.

Cycle time:

```text
Cycle time seconds = 1 / Frequency Hz
```

📌 Examples:

```text
17.7 Hz -> 1 / 17.7 = 0.0565 s = 56.5 ms
1.77 Hz -> 1 / 1.77 = 0.565 s  = 565 ms
0.17 Hz -> 1 / 0.17 = 5.88 s   = 5880 ms
```

This is why `100 mL/P` at `17.7 Hz` only allows `1 ms` pulse width in the table. Longer pulse widths may not leave enough clean OFF time at high flow.

For `1 L/P`, the max cycle is about `565 ms`, so `50 ms`, `100 ms`, and `250 ms` pulses can fit.

## 10. 🔁 Counter Maximum Value and Overflow

The ADAM-6251 documentation found for this model says:

```text
Counter input: 3 kHz (32-bit + 1-bit overflow)
```

A 32-bit counter maximum is:

```text
2^32 - 1 = 4,294,967,295 counts
```

At 3 kHz:

```text
4,294,967,296 / 3,000 = 1,431,655.77 seconds
                         = 397.68 hours
                         = 16.57 days
```

If a software/manual screen describes the counter as `31-bit + 1-bit overflow`, then the normal maximum would be:

```text
2^31 - 1 = 2,147,483,647 counts
```

At 3 kHz:

```text
2,147,483,648 / 3,000 = 715,827.88 seconds
                         = 198.84 hours
                         = 8.29 days
```

Use the exact ADAM register/software documentation to confirm whether your displayed counter value is 32-bit or 31-bit. The overflow bit is a flag that indicates the counter exceeded its normal range.

## 11. 🛠️ Practical Recommendation

✅ For simple totalizing with ADAM-6251:

```text
ECO-OVAL factored pulse = 1 L/P
Pulse width             = 50 ms or 100 ms
ADAM mode               = Counter
ADAM input              = Wet contact, 24 VDC
```

Then calculate:

```text
Total L = ADAM counter x 1 L/P
Flow L/min = Delta counter x 1 x 60 / Delta time seconds
```

🔎 For higher resolution:

```text
Use 100 mL/P or unfactored pulse
```

But this creates more pulses and requires more careful flow calculation.

## 12. 🔗 References

📁 Local files in this folder:

```text
ECO-OVAL-Flowmeters.pdf
ADAM-6200_User_Manual_Ed.5_FINAL.pdf
ADAM-6250_6251_6256_DS(10.18.17)20171102145938.pdf
ADAM-6251 Startup Manual V1.0.pdf
```

🌐 Online references checked:

```text
ECO-OVAL catalog:
https://meterflowmeters.com/wp-content/uploads/2020/01/KATALOG-ECO-OVAL-OVERSEAS-EDITION-OVAL-Flowmeters.pdf

ADAM-6251 manual/spec summary:
https://www.manualslib.com/manual/3845836/Advantech-Adam-6250.html?page=24
```
