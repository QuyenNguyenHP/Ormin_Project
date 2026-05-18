/*
  FireBeetle ESP32 100 Hz pulse source

  Purpose:
  - Simulate a flowmeter pulse output for testing ADAM-6251 counter input.
  - Default output is 100 Hz with 1 ms ON time.

  Important:
  - ESP32 GPIO is 3.3 V only.
  - Do not connect this GPIO directly to a 24 V ADAM wet input.
  - Use an NPN transistor, MOSFET, relay module, or optocoupler to create an
    open-collector/open-drain style output like the ECO-OVAL pulse output.
*/

#include <Arduino.h>

#if __has_include(<esp_arduino_version.h>)
#include <esp_arduino_version.h>
#endif

// FireBeetle board pin D9 is mapped to ESP32 GPIO2.
// Use D9 if your selected Arduino board package defines it; otherwise use GPIO2.
#if defined(D9)
static constexpr uint8_t PWM_PIN = D9;
#else
static constexpr uint8_t PWM_PIN = 2;
#endif

// Pulse settings.
static constexpr uint32_t PWM_FREQUENCY_HZ = 1000;     // 1000 Hz = 1 ms period
static constexpr uint32_t PULSE_WIDTH_US = 1000;      // 1 ms HIGH pulse
static constexpr uint8_t PWM_RESOLUTION_BITS = 10;    // Duty range 0-1023

#if !defined(ESP_ARDUINO_VERSION_MAJOR) || ESP_ARDUINO_VERSION_MAJOR < 3
static constexpr uint8_t PWM_CHANNEL = 0;
#endif

uint32_t calculateDuty()
{
  const uint32_t maxDuty = (1UL << PWM_RESOLUTION_BITS) - 1;
  const uint32_t periodUs = 1000000UL / PWM_FREQUENCY_HZ;

  if (PULSE_WIDTH_US >= periodUs) {
    return maxDuty;
  }

  return (maxDuty * PULSE_WIDTH_US) / periodUs;
}

void setup()
{
  Serial.begin(115200);
  delay(300);

  const uint32_t duty = calculateDuty();
  const uint32_t periodUs = 1000000UL / PWM_FREQUENCY_HZ;

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  if (!ledcAttach(PWM_PIN, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS)) {
    Serial.println("Failed to attach LEDC PWM to pin.");
    return;
  }

  ledcWrite(PWM_PIN, duty);
#else
  ledcSetup(PWM_CHANNEL, PWM_FREQUENCY_HZ, PWM_RESOLUTION_BITS);
  ledcAttachPin(PWM_PIN, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, duty);
#endif

  Serial.println("FireBeetle ESP32 pulse source started.");
  Serial.print("PWM pin: GPIO");
  Serial.println(PWM_PIN);
  Serial.print("Frequency: ");
  Serial.print(PWM_FREQUENCY_HZ);
  Serial.println(" Hz");
  Serial.print("Period: ");
  Serial.print(periodUs);
  Serial.println(" us");
  Serial.print("Pulse width HIGH: ");
  Serial.print(PULSE_WIDTH_US);
  Serial.println(" us");
  Serial.print("Duty value: ");
  Serial.println(duty);
}

void loop()
{
  // Hardware PWM continues automatically.
}
