//prechodova charakteristika RC obvodu
#include <ArduinoJson.h>
float currentInputVoltage = 5;


// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

// the loop function runs over and over again forever
void loop() {
  float value, voltageBefore, voltageAfter;

  voltageBefore = currentInputVoltage;

  analogWrite(9, constrain(currentInputVoltage, 0, 255));
  voltageAfter = (float)analogRead(A0) * 5 / 1023;

  DynamicJsonDocument doc(1024);

  doc["sensor"] = float(voltageBefore - voltageAfter);
  doc["input"] = currentInputVoltage;
  serializeJson(doc, Serial);
  Serial.println();



  String inputString = Serial.readStringUntil('\n');
  if (inputString.charAt(0) != '{') {
    if (inputString.toFloat() != 0) {
      currentInputVoltage = inputString.toFloat();
    }
  }
}
