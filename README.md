# homebridge-domotiga

[![npm version](https://badge.fury.io/js/homebridge-domotiga.svg)](https://badge.fury.io/js/homebridge-domotiga)
[![Dependency Status](https://gemnasium.com/badges/github.com/Samfox2/homebridge-domotiga.svg)](https://gemnasium.com/github.com/Samfox2/homebridge-domotiga)

Supports [Domotiga](https://domotiga.nl) devices on [HomeBridge](https://github.com/nfarina/homebridge) platform.

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
- ```Powermeter``` (power consumption) 

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

 ```sh
"accessories": [
          {
            "accessory": "Domotiga",
            "name": "Sensor garden",
            "host": "localhost",
            "port": "9090",
            "service": "TemperatureSensor",
            "manufacturer": "DIY",
            "model": "TinyTX",
            "device": "81",
            "valueTemperature": "1",
            "valueHumidity":    "2",
            "valueAirPressure": "3",
            "valueBattery":     "4",
            "lowbattery": "3000"
          },
          {
            "accessory": "Domotiga",
            "name": "Combined AirQualitySensor livingroom",
            "host": "DomotiGa",
            "port": "9090",
            "service": "AirQualitySensor",
            "device": "83",
            "valueAirQuality":  "1",
            "valueTemperature": "2",
            "valueHumidity":    "3",
            "valueAirPressure": "4",            
            "valueBattery":     "5",
            "lowbattery": "3000"
          },
          {
            "accessory": "Domotiga",
            "name": "Combined AirQualitySensor with ppm display",
            "host": "DomotiGa",
            "port": "9090",
            "service": "FakeEveAirQualitySensor",
            "device": "89",
            "valueAirQuality":  "1",
            "valueTemperature": "2",
            "valueHumidity":    "3",
            "valueAirPressure": "4",            
            "valueBattery":     "5",
            "lowbattery": "3000"
          }, 
          {
            "accessory": "Domotiga",
            "name": "AirQualitySensor bedroom without battery",
            "host": "DomotiGa",
            "port": "9090",
            "service": "AirQualitySensor",
            "device": "82",
            "valueAirQuality": "1"
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
            "valueSwitch": "1",
            "pollInMs": "10000" 
          },
          {
            "accessory": "Domotiga",
            "name": "Utility room",
            "host": "192.168.0.xxx",
            "port": "9090",
            "service": "LeakSensor",
            "device": "25",
            "valueLeakSensor": "1",
            "valueBattery":    "2",
            "lowbattery": "3000"
          },
          {
            "accessory": "Domotiga",
            "name": "Entrance",
            "host": "192.168.0.xxx",
            "port": "9090",
            "service": "MotionSensor",
            "device": "26",
            "valueMotionSensor": "1",
            "valueBattery":    "2",
            "lowbattery": "3000"
          }, 
          {
            "accessory": "Domotiga",
            "name": "Outlet",
            "host": "192.168.0.xxx",
            "port": "9090",
            "service": "Outlet",
            "device": "72",
            "valueOutlet": "1",
            "valuePowerConsumption": "3",
            "valueTotalPowerConsumption": "7"
          },
          {
            "accessory": "Domotiga",
            "name": "Powermeter basement",
            "host": "192.168.0.xxx",
            "port": "9090",
            "service": "Powermeter",
            "device": "44",
            "valuePowerConsumption": "1",
            "valueTotalPowerConsumption": "2"
        }
    ]
```

Fields:

* ```"accessory":``` Must always be "Domotiga" (required)
* ```"name":``` Can be anything
* ```"host":``` The hostname or ip of the machine running Domotiga (required)
* ```"port":``` The port that Domotiga is using (usually 9090) (required)
* ```"service":``` Service that Domotiga device represents (required)
* ```"manufacturer":``` Manufacturer of accessory (optional)
* ```"model":``` Model of accessory (optional)
* ```"device":```  Domotiga device no. (required)
* ```"valueTemperature":``` Domotiga device value no. of temperature in °C (required for "TemperatureSensor")
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
* ```"valueBattery":```  Value no. of battery in mV
* ```"lowbattery":```    Min. battery level which activates "low battery warning" in mV
* ```"pollInMs":```  Number of milliseconds to wait before polling the database to report open/closed state (opt. for "Switch", "Contact", "Outlet", "LeakSensor", "MotionSensor")


Not yet supported by all homekit apps:

* ```"valuePowerConsumption":```  Value no. of the consumption in W (required for custom "Powermeter")
* ```"valueTotalPowerConsumption":```  Value no. of the total consumption in kWh
