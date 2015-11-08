# homebridge-domotiga
Supports domotiga devices on HomeBridge platform.
At this time, only a combined temperature/hygrometer sensor is supported.

Domotiga device value numbers for temperature/humidity and battery can be assigned within the config.json file.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g git+https://github.com/Samfox2/homebridge-domotiga.git
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
"accessories": [
          {
            "accessory": "Domotiga",
            "name": "Sensor garden",
            "host": "localhost",
            "port": "9090",
            "service": "TempHygroMeter",
            "device": "81",
            "valueTemperature": "1",
            "valueHumidity":   "2",
            "valueBattery":    "4",
            "lowbattery": "3000"
        }
    ]
```
