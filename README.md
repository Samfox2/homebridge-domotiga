# homebridge-domotiga
Supports [Domotiga](https://domotiga.nl) devices on [HomeBridge](https://github.com/nfarina/homebridge) platform.

The latest version (work in progress) supports following services (accessories) :

- temperature/hygrometer
- contact devices
- switch devices
- outlet devices

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
            "valueHumidity":    "2",
            "valueAirPressure": "3",
            "valueBattery":     "4",
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
          },
          {
            "accessory": "Domotiga",
            "name": "Outlet",
            "host": "192.168.2.103",
            "port": "9090",
            "service": "Outlet",
            "device": "72",
            "valueOutlet": "1",
            "valuePowerConsumption": "3",
            "valueTotalPowerConsumption": "7"
          }    
    ]
```

Fields:

* "accessory": Must always be "Domotiga" (required)
* "name": Can be anything
* "host": The hostname or ip of the machine running Domotiga (required)
* "port": The port that Domotiga is using (usually 9090) (required)
* "service": Service that Domotiga device represents (required)
* "device":  Domotiga device no. (required)
* "valueTemperature": Domotiga device value no. of temperature (required for "TempHygroMeter")
* "valueHumidity": Domotiga device value no. of humidity (optional for "TempHygroMeter")
* "valueAirPressure": Domotiga device value no. of air pressure  (optional EVE characteristic for "TempHygroMeter")
* "valueContact":  Domotiga device value no. of the contact (required for "Contact")
* "valueSwitch":   Domotiga device value no. of the switch (required for "Switch")
* "valueOutlet":   Domotiga device value no. of the outlet (required for "Outlet")
* "valuePowerConsumption":  Domotiga device value no. of the consumption in W (optional EVE characteristic for "Outlet")
* "valueTotalPowerConsumption":  Domotiga device value no. of the total consumption in kWh (optional EVE characteristic for "Outlet")

Not yet supported by actual homekit apps:
* "valueBattery":  Domotiga device value no. of battery
* "lowbattery":    Min. battery level which activates "low battery warning"
