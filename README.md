# homebridge-domotiga
Supports [Domotiga](https://domotiga.nl) devices on [HomeBridge](https://github.com/nfarina/homebridge) platform.

The latest version (work in progress) supports following services (accessories) :

- temperature/hygrometer
- contact devices
- switch devices

Domotiga device value numbers (e.g. which device value represents temperature) can be assigned directly within the config.json file.

# Installation

1. Install homebridge using:  ```npm install -g homebridge```
2. Install this plugin using: ```npm install -g git+https://github.com/Samfox2/homebridge-domotiga.git``` or ```npm install -g homebridge-domotiga```
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
          },
          {
            "accessory": "Domotiga",
            "name": "PC",
            "host": "192.168.0.xxx",
            "port": "9090",
            "service": "Contact",
            "device": "77",
            "valueContact": "1",
            "valueBattery":    "2",
            "lowbattery": "3000"
          },
          {
            "accessory": "Domotiga",
            "name": "Printer",
            "host": "192.168.0.xxx",
            "port": "9090",
            "service": "Switch",
            "device": "79",
            "valueSwitch": "1"
          }   
    ]
```

Fields:

* "accessory": Must always be "Domotiga" (required)
* "name": Can be anything
* "host": The hostname or ip of the machine running Domotiga (required)
* "port": The port that Domotiga is using (usually 9090) (required)
* "service": The service that Domotiga device represents - "TempHygroMeter", "Contact", "Switch" (required)
* "device":  Domotiga device no. (required)
* "valueTemperature":  Domotiga device value no. that represents the temperature service (required for "TempHygroMeter")
* "valueHumidity": Value no. of Domotiga device that represents the service (oprional for "TempHygroMeter")
* "valueContact":  Value no. of Domotiga device that represents the service (required for "Contact")
* "valueSwitch":   Value no. of Domotiga device that represents the service (required for "Switch")
* "valueBattery":  Value no. of Domotiga device that represents the service (not yet supported by actual homekit)
* "lowbattery":    Value no. od Domotiga device that represents the service (not yet supported by actual homekit)
