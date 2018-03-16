# homebridge-domotiga

[![npm version](https://badge.fury.io/js/homebridge-domotiga.svg)](https://badge.fury.io/js/homebridge-domotiga)
[![Dependency Status](https://gemnasium.com/badges/github.com/Samfox2/homebridge-domotiga.svg)](https://gemnasium.com/github.com/Samfox2/homebridge-domotiga)
[![npm](https://img.shields.io/npm/dt/homebridge-domotiga.svg)](https://www.npmjs.com/package/homebridge-domotiga)
[![GitHub last commit](https://img.shields.io/github/last-commit/samfox2/homebridge-domotiga.svg)](https://github.com/samfox2/homebridge-domotiga)
[![Donate](https://img.shields.io/badge/donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=328DRJATPXYEJ)

Supports [Domotiga](https://domotiga.nl) devices on [HomeBridge](https://github.com/nfarina/homebridge) platform.


Older version using API 1.0: [homebridge-domotiga-1.0](https://github.com/Samfox2/homebridge-domotiga-1.0) (deprecated)

### Switching from homebridge-domotiga (API 1.0)
Users switching from homebridge-domotiga will need to remove their old config in `config.json` and use the new config. Hence, DomotiGa will show up as brand new device. This is due to the fact that API 2.0 only supports platform plugins and homebridge-domotiga was implemented as an accessory plugin. This means any configurations, alarms, scenes, etc to which the devices were associated will need to be updated with the new DomotiGa devices.


### What this plugin does

The latest version (work in progress) supports following (primary) services:

- ```TemperatureSensor``` (temperature)
- ```HumiditySensor``` (humidity) 
- ```AirQualitySensor``` (air quality) 
- ```FakeEveAirQualitySensor``` (custom Eve service, same as AirQualitySensor with additional ppm value in Eve app)
- ```FakeEveWeatherSensor``` (custom Eve service with airpressure in Eve app)
- ```Contact``` (contact state) 
- ```LeakSensor``` (leaksensor state) 
- ```MotionSensor``` (motionsensor state) 
- ```Switch``` (get/set switch state) 
- ```Outlet``` (get/set outlet state)
- ```Door``` (get/set door position) 
- ```Window``` (get/set window position) 
- ```WindowCovering``` (get/set window covering positon) 
- ```Powermeter``` (custom service with power consumption)
- ```Light bulb``` (get/set light bulb state, if supported dimming as well)
- ```Thermostat``` (get/set OpenTherm thermostat)

Domotiga device value numbers (e.g. which device value represents temperature) can be assigned directly within the config.json file. 
For multi-sensors (e.g. combined temperature/humidity sensors) additional characteristics can be added by defining their domotiga values in config.json (see example below).

# Contributing

Intrigued? Missing any domotiga devices? Love HomeKit and Homebridge? - Feel free to contribute by sending pull requests to get this project going in a more generic direction. Or just open an issue if you have more questions or ideas.

# Installation

1. Install homebridge using:  ```npm install -g homebridge```
2. Install this plugin using: ```npm install -g git+https://github.com/Samfox2/homebridge-domotiga.git``` or ```npm install -g homebridge-domotiga```
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
"platforms": [
    {
        "platform": "Domotiga",
        "name": "Domotiga",
        "host": "localhost",
        "port": "9090",
        "devices": [
            {
                "name": "Sensor garden",
                "service": "TemperatureSensor",
                "manufacturer": "DIY",
                "model": "TinyTX",
                "device": "81",
                "valueTemperature": "1",
                "valueHumidity": "2",
                "valueAirPressure": "3",
                "valueBattery": "4",
                "lowbattery": "3000"
                "polling": true,
                "pollingInterval": "1000"
            },
            {
                "name": "Sensor gardenhouse",
                "service": "HumiditySensor",
                "manufacturer": "DIY",
                "model": "TinyTX",
                "device": "88",
                "valueHumidity": "2",
                "valueBattery": "4",
                "lowbattery": "3000"
				"polling": false,
                "pollingInterval": "1000"
            },
            {
                "name": "Combined AirQualitySensor livingroom",
                "service": "AirQualitySensor",
                "device": "83",
                "valueAirQuality": "1",
                "valueTemperature": "2",
                "valueHumidity": "3",
                "valueAirPressure": "4",
                "valueBattery": "5",
                "lowbattery": "3000"
            },
            {
                "name": "Combined AirQualitySensor with ppm display",
                "service": "FakeEveAirQualitySensor",
                "device": "89",
                "valueAirQuality": "1",
                "valueTemperature": "2",
                "valueHumidity": "3",
                "valueAirPressure": "4",
                "valueBattery": "5",
                "lowbattery": "3000"
            },
            {
                "name": "AirQualitySensor bedroom without battery",
                "service": "AirQualitySensor",
                "device": "82",
                "valueAirQuality": "1"
            },
            {
                "name": "PC",
                "service": "Contact",
                "device": "77",
                "valueContact": "1",
                "valueBattery": "2",
                "lowbattery": "3000"
            },
            {
                "name": "Printer",
                "service": "Switch",
                "device": "79",
                "valueSwitch": "1"
            },
            {
                "name": "Utility room",
                "service": "LeakSensor",
                "device": "25",
                "valueLeakSensor": "1",
                "valueBattery": "2",
                "lowbattery": "3000"
            },
            {
                "name": "Entrance",
                "service": "MotionSensor",
                "device": "26",
                "valueMotionSensor": "1",
                "valueBattery": "2",
                "lowbattery": "3000"
            },
            {
                "name": "Outlet",
                "service": "Outlet",
                "device": "72",
                "valueOutlet": "1",
                "valuePowerConsumption": "3",
                "valueTotalPowerConsumption": "7"
            },
            {
                "name": "Powermeter basement",
                "service": "Powermeter",
                "device": "44",
                "valuePowerConsumption": "1",
                "valueTotalPowerConsumption": "2"
            },
            {
                "name": "Switchable Light bulb",
                "service": "Lightbulb",
                "device": "36",
                "valueLight": "1",
                "brightness": false
            },
            {
                "name": "Dimmable Light bulb",
                "service": "Lightbulb",
                "device": "37",
                "valueLight": "1",
                "brightness": true
            },
            {
                "name": "OpenTherm Thermostat",
                "service": "Thermostat",
                "device": "38",
                "valueTargetTemperature": "1",
                "valueTemperature": "2"
            }
        ]
    }
]
```

Fields:

* ```"platform":``` Must always be Domotiga  (required)
* ```"name":``` Can be anything
* ```"host":``` The hostname or ip of the machine running Domotiga (required)
* ```"port":``` The port that Domotiga is using (usually 9090) (required)
* ```"service":``` Service that Domotiga device represents (required)
* ```"manufacturer":``` Manufacturer of accessory (optional)
* ```"model":``` Model of accessory (optional)
* ```"device":```  Domotiga device no. (required)
* ```"valueTemperature":``` Domotiga device value no. of temperature in Â°C (required for "TemperatureSensor" and "Thermostat")
* ```"valueHumidity":``` Value no. of humidity in % (required for "HumiditySensor")
* ```"valueAirPressure":``` Value no. of air pressure in hPa (required for "FakeEveWeatherSensor")
* ```"valueAirQuality":```  Value no. of the air quality VOC (required for "AirQualitySensor" and "FakeEveAirQualitySensor")
* ```"valueContact":```  Value no. of the contact (required for "Contact")
* ```"valueSwitch":```   Value no. of the switch (required for "Switch")
* ```"valueOutlet":```   Value no. of the outlet (required for "Outlet")
* ```"valueDoor":```     Value no. of the door (required for "Door")
* ```"valueWindow":```   Value no. of the window (required for "Window")
* ```"valueWindowCovering":```   Value no. of the window covering (required for "Window Covering")
* ```"valueLeakSensor":``` Value no. of the leaksensor (required for "LeakSensor")
* ```"valueMotionSensor":``` Value no. of the motionsensor (required for "MotionSensor")
* ```"valueLight":``` Value no. of the light
* ```"brightness":```  Enable/disable dimming with "true" or "false" (required for "Lightbulb")
* ```"valueTargetTemperature":```   Value no. of the thermostat temperature setpoint (for the OpenTherm plugin it should be "1")
* ```"valueBattery":```  Value no. of battery in mV
* ```"lowbattery":```    Min. battery level which activates "low battery warning" in mV
* ```"polling":```   Enable/disable polling with "true" or "false" (optional)
* ```"pollingInterval":```  Number of seconds to wait before polling the database to report open/closed state (optional)



Not yet supported by all homekit apps:

* ```"valuePowerConsumption":```  Value no. of the consumption in W (required for custom "Powermeter")
* ```"valueTotalPowerConsumption":```  Value no. of the total consumption in kWh
