//"use strict";
var Accessory, Service, Characteristic, UUIDGen;
var JSONRequest = require("jsonrequest");
var inherits = require('util').inherits;

module.exports = function (homebridge) {
    console.log("homebridge API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor    
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs    
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    ////////////////////////////// Custom characteristics //////////////////////////////
    EvePowerConsumption = function () {
        Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "watts",
            maxValue: 1000000000,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EvePowerConsumption, Characteristic);

    EveTotalPowerConsumption = function () {
        Characteristic.call(this, 'Total Consumption', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.FLOAT, // Deviation from Eve Energy observed type
            unit: "kilowatthours",
            maxValue: 1000000000,
            minValue: 0,
            minStep: 0.001,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveTotalPowerConsumption, Characteristic);

    EveRoomAirQuality = function () {
        Characteristic.call(this, 'Eve Air Quality', 'E863F10B-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "ppm",
            maxValue: 5000,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveRoomAirQuality, Characteristic);

    EveBatteryLevel = function () {
        Characteristic.call(this, 'Eve Battery Level', 'E863F11B-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "PERCENTAGE",
            maxValue: 100,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveBatteryLevel, Characteristic);

    EveAirPressure = function () {
        //todo: only rough guess of extreme values -> use correct min/max if known
        Characteristic.call(this, 'Eve AirPressure', 'E863F10F-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "hPa",
            maxValue: 1085,
            minValue: 870,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveAirPressure, Characteristic);


    ////////////////////////////// Custom services //////////////////////////////
    PowerMeterService = function (displayName, subtype) {
        Service.call(this, displayName, '00000001-0000-1777-8000-775D67EC4377', subtype);
        // Required Characteristics
        this.addCharacteristic(EvePowerConsumption);
        // Optional Characteristics
        this.addOptionalCharacteristic(EveTotalPowerConsumption);
    };
    inherits(PowerMeterService, Service);

    //Eve service (custom UUID)
    EveRoomService = function (displayName, subtype) {
        Service.call(this, displayName, 'E863F002-079E-48FF-8F27-9C2605A29F52', subtype);
        // Required Characteristics
        this.addCharacteristic(EveRoomAirQuality);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
    };
    inherits(EveRoomService, Service);

    /////////////////////////////////////////////////////////////////////////////////////////////
    //Eve service (custom UUID)
    EveWeatherService = function (displayName, subtype) {
        Service.call(this, displayName, 'E863F001-079E-48FF-8F27-9C2605A29F52', subtype);
        // Required Characteristics
        this.addCharacteristic(EveAirPressure);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
        this.addOptionalCharacteristic(Characteristic.CurrentTemperature);
        this.addOptionalCharacteristic(EveBatteryLevel);
    };
    inherits(EveWeatherService, Service);

    // Consider platform plugin as dynamic platform plugin
    homebridge.registerPlatform("homebridge-domotiga", "DomotiGa", DomotigaPlatform, true);
}

function DomotigaPlatform(log, config, api) {
    this.log = log;
    this.config = config;

    // Global configuration
    this.host = config.host || 'localhost';
    this.port = config.port || 9090;

    // Device specific configuration
    this.devices = this.config.devices || [];
    this.accessories = {};
    this.polling = {};

    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}

// Method to restore accessories from cache
DomotigaPlatform.prototype.configureAccessory = function (accessory) {
    this.setService(accessory);
    this.accessories[accessory.context.name] = accessory;
}

// Method to setup accesories from config.json
DomotigaPlatform.prototype.didFinishLaunching = function () {

    if (!this.devices.length) {
        this.log.error("No devices configured. Please check your 'config.json' file!");
    }

    // Add or update accessories defined in config.json
    for (var i in this.devices) this.addAccessory(this.devices[i]);

    // Remove extra accessories in cache
    for (var name in this.accessories) {
        var accessory = this.accessories[name];
        if (!accessory.reachable) this.removeAccessory(accessory);
    }
}


// Method to add and update HomeKit accessories
DomotigaPlatform.prototype.addAccessory = function (data) {

    this.log("Initializing platform accessory '" + data.name + "'...");

    // Retrieve accessory from cache
    var accessory = this.accessories[data.name];

    if (!accessory) {

        var uuid = UUIDGen.generate(data.name);

        // Setup accessory category.
        accessory = new Accessory(data.name, uuid, 8);

        // Store and initialize logfile into context
        accessory.context.name = data.name || NA;
        accessory.context.service = data.service;
        accessory.context.device = data.device;
        accessory.context.manufacturer = data.manufacturer;
        accessory.context.model = data.model;
        accessory.context.valueTemperature = data.valueTemperature;
        accessory.context.valueHumidity = data.valueHumidity;
        accessory.context.valueAirPressure = data.valueAirPressure;
        accessory.context.valueBattery = data.valueBattery;
        accessory.context.lowbattery = data.lowbattery;
        accessory.context.valueContact = data.valueContact;
        accessory.context.valueSwitch = data.valueSwitch;
        accessory.context.valueAirQuality = data.valueAirQuality;
        accessory.context.valueOutlet = data.valueOutlet;
        accessory.context.valueLeakSensor = data.valueLeakSensor;
        accessory.context.valueMotionSensor = data.valueMotionSensor;
        accessory.context.valuePowerConsumption = data.valuePowerConsumption;
        accessory.context.valueTotalPowerConsumption = data.valueTotalPowerConsumption;
        accessory.context.polling = data.polling;
        accessory.context.pollInMs = data.pollInMs || 1;

        // Setup HomeKit service(-s)
        switch (accessory.context.service) {

            case "TemperatureSensor":
                accessory.context.primaryservice = new Service.TemperatureSensor(accessory.context.name);;
                break;

            case "HumiditySensor":
                accessory.context.primaryservice = new Service.HumiditySensor(accessory.context.name);
                break;

            case "Contact":
                accessory.context.primaryservice = new Service.ContactSensor(accessory.context.name);

            case "LeakSensor":
                accessory.context.primaryservice = new Service.LeakSensor(accessory.context.name);
                break;

            case "MotionSensor":
                accessory.context.primaryservice = new Service.MotionSensor(accessory.context.name);
                break;

            case "Switch":
                accessory.context.primaryservice = new Service.Switch(accessory.context.name);
                break;

            case "Outlet":
                accessory.context.primaryservice = new Service.Outlet(accessory.context.name);
                break;

            case "AirQualitySensor":
                accessory.context.primaryservice = new Service.AirQualitySensor(accessory.context.name);
                break;

            case "FakeEveAirQualitySensor":
                accessory.context.primaryservice = new EveRoomService("Eve Room");
                break;

            case "FakeEveWeatherSensor":
                accessory.context.primaryservice = new EveWeatherService("Eve Weather");
                break;

            case "FakeEveWeatherSensorWithLog":
                accessory.context.primaryservice = new EveWeatherService("Eve Weather");
                break;

            case "Powermeter":
                accessory.context.primaryservice = new PowerMeterService(accessory.context.name);
                break;

            default:
                this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
                break;
        }

        // Everything outside the primary service gets added as additional characteristics...
        if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
            accessory.context.primaryservice.addCharacteristic(Characteristic.CurrentTemperature);
        }
        if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
            accessory.context.primaryservice.addCharacteristic(Characteristic.CurrentRelativeHumidity);
        }
        if (accessory.context.valueBattery) {
            accessory.context.primaryservice.addCharacteristic(Characteristic.BatteryLevel);
        }
        if (accessory.context.lowbattery) {
            accessory.context.primaryservice.addCharacteristic(Characteristic.StatusLowBattery);
        }
        // Additional required characteristic for outlet
        if (accessory.context.service == "Outlet") {
            accessory.context.primaryservice.addCharacteristic(Characteristic.OutletInUse);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
            accessory.context.primaryservice.addCharacteristic(EveAirPressure);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirQuality &&
            (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
            accessory.context.primaryservice.addCharacteristic(Characteristic.AirQuality);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
            accessory.context.primaryservice.addCharacteristic(EvePowerConsumption);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            accessory.context.primaryservice.addCharacteristic(EveTotalPowerConsumption);
        }

        // Setup HomeKit switch service
        accessory.addService(accessory.context.primaryservice, data.name);

        // New accessory is always reachable
        accessory.reachable = true;

        // Setup listeners for different events
        this.setService(accessory);

        // Register accessory in HomeKit
        this.api.registerPlatformAccessories("homebridge-domotiga", "DomotiGa", [accessory]);

        // Store accessory in cache
        this.accessories[data.name] = accessory;
    }

    // Confirm variable type
    data.polling = data.polling === true;
    data.pollInMs = parseInt(data.pollInMs, 10) || 1;

    // Store and initialize variables into context
    accessory.context.cacheCurrentTemperature = 0;
    accessory.context.cacheCurrentRelativeHumidity = 99;
    accessory.context.cacheCurrentAirPressure = 1000;
    accessory.context.cacheContactSensorState = Characteristic.ContactSensorState.CONTACT_DETECTED;
    accessory.context.cacheLeakSensorState = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    accessory.context.cacheOutletState = 0;
    accessory.context.cacheOutletInUse = false;
    accessory.context.cacheCurrentAirQuality = Characteristic.AirQuality.POOR;
    accessory.context.cacheAirQuality = 0;
    accessory.context.cachePowerConsumption = 0;
    accessory.context.cacheTotalPowerConsumption = 0;
    accessory.context.cacheCurrentBatteryLevel = 0;
    accessory.context.cacheStatusLowBattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    accessory.context.cacheMotionDetected = 0;
    accessory.context.cacheSwitchState = 0;

    // Retrieve initial state
    this.getInitState(accessory);

    // Store accessory in cache
    this.accessories[data.name] = accessory;

    // Configure state polling
    if (data.polling) this.doPolling(data.name);
}

// Function to remove accessory dynamically from outside event
DomotigaPlatform.prototype.removeAccessory = function (accessory) {
    if (accessory) {
        var name = accessory.context.name;
        this.log.warn("Removing Domotigadevice: " + name + ". No longer reachable or configured.");
        this.api.unregisterPlatformAccessories("homebridge-domotiga", "DomotiGa", [accessory]);
        delete this.accessories[name];
    }
}

// Method to determine current state
DomotigaPlatform.prototype.doPolling = function (name) {
    this.log("Polling... ");

    var accessory = this.accessories[name];
    var thisDevice = accessory.context;

    // Clear polling
    clearTimeout(this.polling[name]);

    switch (thisDevice.service) {

        case "TemperatureSensor":

            this.getCurrentTemperature(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentTemperature) {
                    thisDevice.cacheCurrentTemperature = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
                }
            });
            break;

        case "HumiditySensor":
            this.getCurrentRelativeHumidity(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentRelativeHumidity) {
                    thisDevice.cacheCurrentRelativeHumidity = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
                }
            });
            break;

        case "Contact":
            this.getContactState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheContactSensorState) {
                    thisDevice.cacheContactSensorState = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.cacheContactSensorState).getValue();
                }
            });
            break;

        case "LeakSensor":
            this.getLeakSensorState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheLeakDetected) {
                    thisDevice.cacheLeakSensorState = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.LeakDetected).getValue();
                }
            });
            break;

        case "MotionSensor":
            this.getMotionSensorState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheMotionDetected) {
                    thisDevice.cacheMotionDetected = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.MotionDetected).getValue();
                }
            });
            break;

        case "Switch":
            this.getSwitchState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheSwitchState) {
                    thisDevice.cacheSwitchState = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.On).getValue();
                }
            });
            break;

        case "Outlet":
            this.getOutletState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheOutletState) {
                    thisDevice.cacheOutletState = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.On).getValue();
                }
            });
            break;

        case "AirQualitySensor":
            this.getCurrentAirQuality(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentAirQuality) {
                    thisDevice.cacheCurrentAirQuality = value;
                    accessory.context.primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
                }
            });
            break;

        case "FakeEveAirQualitySensor":
            this.getCurrentEveAirQuality(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentAirQuality) {
                    thisDevice.cacheCurrentAirQuality = value;
                    accessory.context.primaryservice.getCharacteristic(EveRoomAirQuality).getValue();
                }
            });
            break;

        case "FakeEveWeatherSensor":
            this.getCurrentAirPressure(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentAirPressure) {
                    thisDevice.cacheAirQuality = value;
                    accessory.context.primaryservice.getCharacteristic(EveAirPressure).getValue();
                }
            });
            break;

        case "Powermeter":
            this.getEvePowerConsumption(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cachePowerConsumption) {
                    thisDevice.cachePowerConsumption = value;
                    accessory.context.primaryservice.getCharacteristic(EvePowerConsumption).getValue();
                }
            });
            break;

        default:
            this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
            break;
    }

    // Additional/optional characteristics...
    if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
        this.getCurrentTemperature(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentTemperature) {
                thisDevice.cacheCurrentTemperature = value;
                accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
            }
        });
    }
    if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
        this.getCurrentRelativeHumidity(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentRelativeHumidity) {
                thisDevice.cacheCurrentRelativeHumidity = value;
                accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
            }
        });
    }
    if (accessory.context.valueBattery) {
        this.getCurrentBatteryLevel(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentBatteryLevel) {
                thisDevice.cacheCurrentBatteryLevel = value;
                accessory.context.primaryservice.getCharacteristic(Characteristic.BatteryLevel).getValue();
            }
        });
    }
    if (accessory.context.lowbattery) {
        this.getLowBatteryStatus(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheStatusLowBattery) {
                thisDevice.cacheStatusLowBattery = value;
                accessory.context.primaryservice.getCharacteristic(Characteristic.StatusLowBattery).getValue();
            }
        });
    }
    // Additional required characteristic for outlet
    if (accessory.context.service == "Outlet") {
        this.getOutletInUse(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheOutletInUse) {
                thisDevice.cacheOutletInUse = value;
                accessory.context.primaryservice.getCharacteristic(Characteristic.OutletInUse).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirPressure &&
        (accessory.context.service != "FakeEveWeatherSensor")) {
        this.getCurrentAirPressure(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentAirPressure) {
                thisDevice.cacheAirQuality = value;
                accessory.context.primaryservice.getCharacteristic(EveAirPressure).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirQuality &&
        (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
        this.getCurrentEveAirQuality(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentAirQuality) {
                thisDevice.cacheCurrentAirQuality = value;
                accessory.context.primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
        this.getEvePowerConsumption(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cachePowerConsumption) {
                thisDevice.cachePowerConsumption = value;
                accessory.context.primaryservice.getCharacteristic(EvePowerConsumption).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueTotalPowerConsumption) {
        this.getEveTotalPowerConsumption(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheTotalPowerConsumption) {
                thisDevice.cacheTotalPowerConsumption = value;
                accessory.context.primaryservice.getCharacteristic(EveTotalPowerConsumption).getValue();
            }
        });
    }

    // Setup for next polling
    this.polling[name] = setTimeout(this.doPolling.bind(this, name), thisDevice.pollInMs * 1000);

}

// Method to setup listeners for different events
DomotigaPlatform.prototype.setService = function (accessory) {

    // Setup HomeKit service(-s)
    switch (accessory.context.service) {

        case "TemperatureSensor":
            accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({ minValue: -55, maxValue: 100 })
                .on('get', this.pollCurrentTemperature.bind(this, accessory.context));
            break;

        case "HumiditySensor":
            accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.pollCurrentRelativeHumidity.bind(this, accessory.context));
            break;

        case "Contact":
            accessory.context.primaryservice.getCharacteristic(Characteristic.ContactSensorState)
                .on('get', this.pollContactState.bind(this, accessory.context));

        case "LeakSensor":
            accessory.context.primaryservice.getCharacteristic(Characteristic.LeakDetected)
                .on('get', this.pollLeakSensorState.bind(this, accessory.context));
            break;

        case "MotionSensor":
            accessory.context.primaryservice.getCharacteristic(Characteristic.MotionDetected)
                .on('get', this.pollMotionSensorState.bind(this, accessory.context));
            break;

        case "Switch":
            accessory.context.primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.pollSwitchState.bind(this, accessory.context))
            break;

        case "Outlet":
            accessory.context.primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.pollOutletState.bind(this, accessory.context))
                .on('set', this.setOutletState.bind(this, accessory.context));
            break;

        case "AirQualitySensor":
            accessory.context.primaryservice.getCharacteristic(Characteristic.AirQuality)
                .on('get', this.pollCurrentAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveAirQualitySensor":
            accessory.context.primaryservice.getCharacteristic(EveRoomAirQuality)
                .on('get', this.pollCurrentEveAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveWeatherSensor":
            accessory.context.primaryservice.getCharacteristic(EveAirPressure)
                .on('get', this.pollCurrentAirPressure.bind(this, accessory.context));
            break;

        case "Powermeter":
            accessory.context.primaryservice.getCharacteristic(EvePowerConsumption)
                .on('get', this.pollEvePowerConsumption.bind(this, accessory.context));
            break;

        default:
            this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
            break;
    }

    // Everything outside the primary service gets added as additional characteristics...
    if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
        accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({ minValue: -55, maxValue: 100 })
            .on('get', this.pollCurrentTemperature.bind(this, accessory.context));
    }
    if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
        accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.pollCurrentRelativeHumidity.bind(this, accessory.context));
    }
    if (accessory.context.valueBattery) {
        accessory.context.primaryservice.getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this.pollCurrentBatteryLevel.bind(this, accessory.context));
    }
    if (accessory.context.lowbattery) {
        accessory.context.primaryservice.getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', this.pollLowBatteryStatus.bind(this, accessory.context));
    }
    // Additional required characteristic for outlet
    if (accessory.context.service == "Outlet") {
        accessory.context.primaryservice.getCharacteristic(Characteristic.OutletInUse)
            .on('get', this.pollOutletInUse.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirPressure &&
        (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
        accessory.context.primaryservice.getCharacteristic(EveAirPressure)
            .on('get', this.pollCurrentAirPressure.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirQuality &&
        (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
        accessory.context.primaryservice.getCharacteristic(Characteristic.AirQuality)
            .on('get', this.pollCurrentEveAirQuality.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
        accessory.context.primaryservice.getCharacteristic(EvePowerConsumption)
            .on('get', this.pollEvePowerConsumption.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueTotalPowerConsumption) {
        accessory.context.primaryservice.getCharacteristic(EveTotalPowerConsumption)
            .on('get', this.pollEveTotalPowerConsumption.bind(this, accessory.context));
    }

    accessory.on('identify', this.identify.bind(this, accessory.context));
}

// Initialize accessory 
DomotigaPlatform.prototype.getInitState = function (accessory) {

    // Update HomeKit accessory information
    accessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer)
        .setCharacteristic(Characteristic.Model, accessory.context.model)
        .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device %s %s", accessory.context.device, accessory.context.name));

    // Retrieve initial state if polling is disabled
    if (!accessory.context.polling) {

        switch (accessory.context.service) {

            case "TemperatureSensor":
                accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
                break;

            case "HumiditySensor":
                accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
                break;


            case "Contact":
                accessory.context.primaryservice.getCharacteristic(Characteristic.ContactSensorState).getValue();
                break;


            case "LeakSensor":
                accessory.context.primaryservice.getCharacteristic(Characteristic.LeakDetected).getValue();
                break;


            case "MotionSensor":
                accessory.context.primaryservice.getCharacteristic(Characteristic.MotionDetected).getValue();
                break;


            case "Switch":
                accessory.context.primaryservice.getCharacteristic(Characteristic.On).getValue();
                break;


            case "Outlet":
                accessory.context.primaryservice.getCharacteristic(Characteristic.On).getValue();
                break;


            case "AirQualitySensor":
                accessory.context.primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
                break;


            case "FakeEveAirQualitySensor":
                accessory.context.primaryservice.getCharacteristic(EveRoomAirQuality).getValue();
                break;


            case "FakeEveWeatherSensor":
                accessory.context.primaryservice.getCharacteristic(EveAirPressure).getValue();
                break;


            case "FakeEveWeatherSensorWithLog":
                accessory.context.primaryservice.getCharacteristic(EveAirPressure).getValue();
                break;

            case "Powermeter":
                accessory.primaryservice.getCharacteristic(EvePowerConsumption).getValue();
                break;

            default:
                this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
                break;
        }

        // Additional/optional characteristics...
        if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
            accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
        }
        if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
            accessory.context.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
        }
        if (accessory.context.valueBattery) {
            accessory.context.primaryservice.getCharacteristic(Characteristic.BatteryLevel).getValue();
        }
        if (accessory.context.lowbattery) {
            accessory.context.primaryservice.getCharacteristic(Characteristic.StatusLowBattery).getValue();
        }
        // Additional required characteristic for outlet
        if (accessory.context.service == "Outlet") {
            accessory.context.primaryservice.getCharacteristic(Characteristic.OutletInUse).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
            accessory.context.primaryservice.getCharacteristic(EveAirPressure).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirQuality &&
            (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
            accessory.context.primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
            accessory.context.primaryservice.getCharacteristic(EvePowerConsumption).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            accessory.context.primaryservice.getCharacteristic(EveTotalPowerConsumption).getValue();
        }
    }

    // Configured accessory is reachable
    accessory.updateReachability(true);
}

DomotigaPlatform.prototype.getCurrentTemperature = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting Temperature...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueTemperature, function (error, result) {
        if (error) {
            self.log.error('%s: CurrentTemperature GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            self.log('%s: CurrentTemperature: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

// Method to determine current temperature
DomotigaPlatform.prototype.pollCurrentTemperature = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached CurrentTemperature is: %s', thisDevice.name, thisDevice.cacheCurrentTemperature);
        callback(null, thisDevice.cacheCurrentTemperature);
    } else {
        // Check value if polling is disabled
        this.getCurrentTemperature(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentTemperature = value;
            callback(error, thisDevice.cacheCurrentTemperature);
        });
    }
}

DomotigaPlatform.prototype.getCurrentRelativeHumidity = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting CurrentRelativeHumidity...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueHumidity, function (error, result) {
        if (error) {
            self.log.error('%s: CurrentTemperature GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            self.log('%s: CurrentRelativeHumidity: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

// Method to determine current relative humidity
DomotigaPlatform.prototype.pollCurrentRelativeHumidity = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached CurrentRelativeHumidity is: %s', thisDevice.name, thisDevice.cacheCurrentRelativeHumidity);
        callback(null, thisDevice.cacheCurrentRelativeHumidity);
    } else {
        // Check value if polling is disabled
        this.getCurrentRelativeHumidity(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentRelativeHumidity = value;
            callback(error, thisDevice.cacheCurrentRelativeHumidity);
        });
    }
}

DomotigaPlatform.prototype.getTemperatureUnits = function (thisDevice, callback) {
    this.log("%s: getting Temperature unit...", thisDevice.name);
    // 1 = F and 0 = C
    callback(null, 0);
}


DomotigaPlatform.prototype.getCurrentAirPressure = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting CurrentAirPressure...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueAirPressure, function (error, result) {
        if (error) {
            self.log.error('%s: CurrentAirPressure GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            self.log('%s: CurrentAirPressure: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollCurrentAirPressure = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached CurrentAirPressure is: %s', thisDevice.name, thisDevice.cacheCurrentAirPressure);
        callback(null, thisDevice.cacheCurrentAirPressure);
    } else {
        // Check value if polling is disabled
        this.getCurrentAirPressure(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentAirPressure = value;
            callback(error, thisDevice.cacheCurrentAirPressure);
        });
    }
}

DomotigaPlatform.prototype.getContactState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting getContactState...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueContact, function (error, result) {
        if (error) {
            self.log.error('%s: getGetContactState GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (result.toLowerCase() == "on") ? Characteristic.ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED;

            self.log('%s: ContactState: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollContactState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheContactSensorState is: %s', thisDevice.name, thisDevice.cacheContactSensorState);
        callback(null, thisDevice.cacheContactSensorState);
    } else {
        // Check value if polling is disabled
        this.getContactState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheContactSensorState = value;
            callback(error, thisDevice.cacheContactSensorState);
        });
    }
}

DomotigaPlatform.prototype.getLeakState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting getLeakState...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueLeakSensor, function (error, result) {
        if (error) {
            self.log.error('%s: getLeakSensorState GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (Number(result) == 0) ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED;

            self.log('%s: LeakSensorState: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollLeakState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheLeakSensorState is: %s', thisDevice.name, thisDevice.cacheLeakSensorState);
        callback(null, thisDevice.cacheLeakSensorState);
    } else {
        // Check value if polling is disabled
        this.getLeakState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheLeakSensorState = value;
            callback(error, thisDevice.cacheLeakSensorState);
        });
    }
}

DomotigaPlatform.prototype.getOutletState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting getOutletState...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: getOutletState GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (result.toLowerCase() == "on") ? 0 : 1;

            self.log('%s: outletState: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollOutletState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheOutletState is: %s', thisDevice.name, thisDevice.cacheOutletState);
        callback(null, thisDevice.cacheOutletState);
    } else {
        // Check value if polling is disabled
        this.getOutletState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheOutletState = value;
            callback(error, thisDevice.cacheOutletState);
        });
    }
}

DomotigaPlatform.prototype.setOutletState = function (thisDevice, boolvalue, callback) {
    var self = this;
    self.log("%s: Setting outlet state to %s", thisDevice.name, boolvalue);

    if (boolvalue == 1)
        thisDevice.outletState = "On";
    else
        thisDevice.outletState = "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueOutlet, thisDevice.outletState, function (err) {
        if (callbackWasCalled)
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");

        callbackWasCalled = true;
        if (!err) {
            self.log("%s: Successfully set outlet state to %s", thisDevice.name, thisDevice.outletState);
            callback(null);
        } else {
            self.log.error("%s: Error setting outlet state to %s", thisDevice.name, thisDevice.outletState);
            callback(err);
        }
    });
}

DomotigaPlatform.prototype.getOutletInUse = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting OutletInUse...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: OutletInUse GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (result.toLowerCase() == "on") ? false : true;

            self.log('%s: OutletInUse: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollOutletInUse = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheOutletInUse is: %s', thisDevice.name, thisDevice.cacheOutletInUse);
        callback(null, thisDevice.cacheOutletInUse);
    } else {
        // Check value if polling is disabled
        this.getOutletInUse(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheOutletInUse = value;
            callback(error, thisDevice.cacheOutletInUse);
        });
    }
}

DomotigaPlatform.prototype.getCurrentAirQuality = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting CurrentAirQuality...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueAirQuality, function (error, result) {
        if (error) {
            self.log.error('%s: valueAirQuality GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            voc = Number(result);
            this.log('CurrentAirQuality level: %s', voc);

            var value;

            if (voc > 1500)
                value = Characteristic.AirQuality.POOR;
            else if (voc > 1000)
                value = Characteristic.AirQuality.INFERIOR;
            else if (voc > 800)
                value = Characteristic.AirQuality.FAIR;
            else if (voc > 600)
                value = Characteristic.AirQuality.GOOD;
            else if (voc > 0)
                value = Characteristic.AirQuality.EXCELLENT;
            else
                value = Characteristic.AirQuality.UNKNOWN;

            self.log('%s: CurrentAirQuality: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollCurrentAirQuality = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheCurrentAirQuality is: %s', thisDevice.name, thisDevice.cacheCurrentAirQuality);
        callback(null, thisDevice.cacheCurrentAirQuality);
    } else {
        // Check value if polling is disabled
        this.getCurrentAirQuality(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentAirQuality = value;
            callback(error, thisDevice.cacheCurrentAirQuality);
        });
    }
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.getCurrentEveAirQuality = function (thisDevice, callback) {
    // Custom Eve intervals:
    //    0... 700 : Exzellent
    //  700...1100 : Good
    // 1100...1600 : Acceptable
    // 1600...2000 : Moderate
    //      > 2000 : Bad	
    var self = this;
    self.log("%s: getting CurrentEveAirQuality...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueAirQuality, function (error, result) {
        if (error) {
            self.log.error('%s: getCurrentEveAirQuality GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            if (value < 0)
                value = 0;

            self.log('%s: CurrentEveAirQuality: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollCurrentEveAirQuality = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheCurrentAirQuality is: %s', thisDevice.name, thisDevice.cacheCurrentAirQuality);
        callback(null, thisDevice.cacheCurrentAirQuality);
    } else {
        // Check value if polling is disabled
        this.getCurrentEveAirQuality(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentAirQuality = value;
            callback(error, thisDevice.cacheCurrentAirQuality);
        });
    }
}

// Eve characteristic (custom UUID) 
DomotigaPlatform.prototype.getEvePowerConsumption = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting getEvePowerConsumption...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: getEvePowerConsumption GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Math.round(Number(result)); // W

            self.log('%s: PowerConsumption: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollEvePowerConsumption = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cachePowerConsumption is: %s', thisDevice.name, thisDevice.cachePowerConsumption);
        callback(null, thisDevice.cachePowerConsumption);
    } else {
        // Check value if polling is disabled
        this.getEvePowerConsumption(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cachePowerConsumption = value;
            callback(error, thisDevice.cachePowerConsumption);
        });
    }
}

// Eve characteristic (custom UUID) 
DomotigaPlatform.prototype.getEveTotalPowerConsumption = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting EveTotalPowerConsumption...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: getEvePowerConsumption GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Math.round(Number(result) * 1000.0) / 1000.0; // kWh

            self.log('%s: TotalPowerConsumption: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollEveTotalPowerConsumption = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheTotalPowerConsumption is: %s', thisDevice.name, thisDevice.cacheTotalPowerConsumption);
        callback(null, thisDevice.cacheTotalPowerConsumption);
    } else {
        // Check value if polling is disabled
        this.getEveTotalPowerConsumption(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheTotalPowerConsumption = value;
            callback(error, thisDevice.cacheTotalPowerConsumption);
        });
    }
}

DomotigaPlatform.prototype.getCurrentBatteryLevel = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting getCurrentBatteryLevel...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueBattery, function (error, result) {
        if (error) {
            self.log.error('%s: getCurrentBatteryLevel GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            thisDevice.lastBatteryLevel = (Number(result));
            //this.log('CurrentBattery level Number(result): %s', Number(result));
            var value = parseInt(thisDevice.lastBatteryLevel * 100 / 5000, 10);
            if (value > 100)
                value = 100;
            else if (value < 0)
                value = 0;

            self.log('%s: CurrentBattery: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollCurrentBatteryLevel = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheCurrentBatteryLevel is: %s', thisDevice.name, thisDevice.cacheCurrentBatteryLevel);
        callback(null, thisDevice.cacheCurrentBatteryLevel);
    } else {
        // Check value if polling is disabled
        this.getCurrentBatteryLevel(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentBatteryLevel = value;
            callback(error, thisDevice.cacheCurrentBatteryLevel);
        });
    }
}

DomotigaPlatform.prototype.getLowBatteryStatus = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting LowBatteryStatus...", thisDevice.name);

    var value = (thisDevice.lastBatteryLevel < Number(thisDevice.lowbattery)) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    self.log('%s: StatusLowBattery: %s', thisDevice.name, value);
}

DomotigaPlatform.prototype.pollLowBatteryStatus = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheCurrentBatteryLevel is: %s', thisDevice.name, thisDevice.cacheStatusLowBattery);
        callback(null, thisDevice.cacheStatusLowBattery);
    } else {
        // Check value if polling is disabled
        this.getLowBatteryStatus(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheStatusLowBattery = value;
            callback(error, thisDevice.cacheStatusLowBattery);
        });
    }
}

DomotigaPlatform.prototype.getMotionSensorState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting getMotionSensorState...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueMotionSensor, function (error, result) {
        if (error) {
            self.log.error('%s: getMotionSensorState GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (Number(result) == 0) ? 1 : 0;

            self.log('%s: MotionDetected: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollMotionSensorState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheMotionDetected is: %s', thisDevice.name, thisDevice.cacheMotionDetected);
        callback(null, thisDevice.cacheMotionDetected);
    } else {
        // Check value if polling is disabled
        this.getMotionSensorState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheMotionDetected = value;
            callback(error, thisDevice.cacheMotionDetected);
        });
    }
}

DomotigaPlatform.prototype.getSwitchState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting getSwitchState...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueSwitch, function (error, result) {
        if (error) {
            self.log.error('%s: getSwitchState GetValue failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {

            var value = (result.toLowerCase() == "on") ? 1 : 0;

            this.log('%s: SwitchState: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.pollSwitchState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached cacheSwitchState is: %s', thisDevice.name, thisDevice.cacheSwitchState);
        callback(null, thisDevice.cacheSwitchState);
    } else {
        // Check value if polling is disabled
        this.getSwitchState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheSwitchState = value;
            callback(error, thisDevice.cacheSwitchState);
        });
    }
}

DomotigaPlatform.prototype.setSwitchState = function (thisDevice, switchOn, callback) {
    var self = this;
    self.log("%s: setting SwitchState to %s", thisDevice.name, switchOn);
    var switchCommand;

    if (switchOn == 1) {
        switchCommand = "On";
    }
    else {
        switchCommand = "Off";
    }

    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueSwitch, switchCommand, function (err) {
        if (callbackWasCalled) {
            this.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            self.log("%s: Successfully set switch state to %s", thisDevice.name, switchCommand);
            callback(null);
        } else {
            self.log.error("%s: Error setting switch state to %s", thisDevice.name, switchCommand);
            callback(err);
        }
    });
}

DomotigaPlatform.prototype.identify = function (thisDevice, paired, callback) {
    this.log("%s: Identify requested", thisDevice.name);
    callback();
}

// Set value at domotiga database
DomotigaPlatform.prototype.domotigaSetValue = function (device, deviceValueNo, value, callback) {

    JSONRequest('http://' + this.host + ':' + this.port, {
        jsonrpc: "2.0",
        method: "device.set",
        params: {
            "device_id": device,
            "valuenum": deviceValueNo,
            "value": value
        },
        id: 1
    }, function (err, data) {
        //this.log("data:", data);
        if (err) {
            this.log.error("Sorry err: ", err);
            callback(err);
        } else {
            callback();
        }
    });
}

// Get value from domotiga database
DomotigaPlatform.prototype.domotigaGetValue = function (device, deviceValueNo, callback) {

    var self = this;
    //self.log( "deviceValueNo: ",deviceValueNo);
    JSONRequest('http://' + self.host + ':' + self.port, {
        jsonrpc: "2.0",
        method: "device.get",
        params: {
            "device_id": device
        },
        id: 1
    }, function (err, data) {
        if (err) {
            self.log.error("Sorry err: ", err);
            callback(err);
        } else {
            let item = Number(deviceValueNo) - 1;
            //self.log("data.result:", data.result);
            //self.log( "item: ",item);
            //self.log( "data.result.values[item]", data.result.values[item]);
            //self.log( "data.result.values[item].value", data.result.values[item].value);
            callback(null, data.result.values[item].value);
        }
    });
}

// Method to handle plugin configuration in HomeKit app
DomotigaPlatform.prototype.configurationRequestHandler = function (context, request, callback) {
    if (request && request.type === "Terminate") {
        return;
    }

    // Instruction
    if (!context.step) {
        var instructionResp = {
            "type": "Interface",
            "interface": "instruction",
            "title": "Before You Start...",
            "detail": "Please make sure homebridge is running with elevated privileges.",
            "showNextButton": true
        }

        context.step = 1;
        callback(instructionResp);
    } else {
        switch (context.step) {
            case 1:
                // Operation choices
                var respDict = {
                    "type": "Interface",
                    "interface": "list",
                    "title": "What do you want to do?",
                    "items": [
                      "Add New Device",
                      "Modify Existing Device",
                      "Remove Existing Device"
                    ]
                }

                context.step = 2;
                callback(respDict);
                break;
            case 2:
                var selection = request.response.selections[0];
                if (selection === 0) {
                    // Info for new accessory
                    var respDict = {
                        "type": "Interface",
                        "interface": "input",
                        "title": "New Device",
                        "items": [{
                            "id": "name",
                            "title": "Name (Required)",
                            "placeholder": "HTPC"
                        }]
                    };

                    context.operation = 0;
                    context.step = 3;
                    callback(respDict);
                } else {
                    var self = this;
                    var names = Object.keys(this.accessories).map(function (k) { return self.accessories[k].context.name });

                    if (names.length > 0) {
                        // Select existing accessory for modification or removal
                        if (selection === 1) {
                            var title = "Which device do you want to modify?";
                            context.operation = 1;
                        } else {
                            var title = "Which device do you want to remove?";
                            context.operation = 2;
                        }
                        var respDict = {
                            "type": "Interface",
                            "interface": "list",
                            "title": title,
                            "items": names
                        };

                        context.list = names;
                        context.step = 3;
                    } else {
                        var respDict = {
                            "type": "Interface",
                            "interface": "instruction",
                            "title": "Unavailable",
                            "detail": "No device is configured.",
                            "showNextButton": true
                        };

                        context.step = 1;
                    }
                    callback(respDict);
                }
                break;
            case 3:
                if (context.operation === 2) {
                    // Remove selected accessory from HomeKit
                    var selection = context.list[request.response.selections[0]];
                    var accessory = this.accessories[selection];

                    this.removeAccessory(accessory);
                    var respDict = {
                        "type": "Interface",
                        "interface": "instruction",
                        "title": "Success",
                        "detail": "The device is now removed.",
                        "showNextButton": true
                    };

                    context.step = 5;
                }
                else {
                    if (context.operation === 0) {
                        var data = request.response.inputs;
                    } else if (context.operation === 1) {
                        var selection = context.list[request.response.selections[0]];
                        var data = this.accessories[selection].context;
                    }

                        //    if (data.name) {
                        //        // Add/Modify info of selected accessory
                        //        var respDict = {
                        //            "type": "Interface",
                        //            "interface": "input",
                        //            "title": data.name,
                        //            "items": [{
                        //                "id": "on_cmd",
                        //                "title": "CMD to Turn On",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "wakeonlan XX:XX:XX:XX:XX:XX"
                        //            }, {
                        //                "id": "off_cmd",
                        //                "title": "CMD to Turn Off",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "net rpc shutdown -I XXX.XXX.XXX.XXX -U user%password"
                        //            }, {
                        //                "id": "state_cmd",
                        //                "title": "CMD to Check ON State",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "ping -c 2 -W 1 XXX.XXX.XXX.XXX | grep -i '2 received'"
                        //            }, {
                        //                "id": "polling",
                        //                "title": "Enable Polling (true/false)",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "false"
                        //            }, {
                        //                "id": "interval",
                        //                "title": "Polling Interval",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "1"
                        //            }, {
                        //                "id": "manufacturer",
                        //                "title": "Manufacturer",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "Default-Manufacturer"
                        //            }, {
                        //                "id": "model",
                        //                "title": "Model",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "Default-Model"
                        //            }, {
                        //                "id": "serial",
                        //                "title": "Serial",
                        //                "placeholder": context.operation ? "Leave blank if unchanged" : "Default-SerialNumber"
                        //            }]
                        //        };

                        //        delete context.list;
                        //        delete context.operation;
                        //        context.name = data.name;
                        //        context.step = 4;
                        //    } 
                    else {
                        // Error if required info is missing
                        var respDict = {
                            "type": "Interface",
                            "interface": "instruction",
                            "title": "Error",
                            "detail": "Name of the device is missing.",
                            "showNextButton": true
                        };

                        context.step = 1;
                    }
                }
                callback(respDict);
                break;
                //case 4:
                //    var userInputs = request.response.inputs;
                //    var newSwitch = {};

                //    // Setup input for addAccessory
                //    if (this.accessories[context.name]) {
                //        newSwitch = JSON.parse(JSON.stringify(this.accessories[context.name].context));
                //    }

                //    newAccessory.name = context.name;
                //    newAccessory.on_cmd = userInputs.on_cmd || newSwitch.on_cmd;
                //    newAccessory.off_cmd = userInputs.off_cmd || newSwitch.off_cmd;
                //    newAccessory.state_cmd = userInputs.state_cmd || newSwitch.state_cmd;
                //    newAccessory.polling = userInputs.polling || newSwitch.polling;
                //    newAccessory.interval = userInputs.interval || newSwitch.interval;
                //    newAccessory.manufacturer = userInputs.manufacturer;
                //    newAccessory.model = userInputs.model;
                //    newAccessory.serial = userInputs.serial;

                //    // Register or update accessory in HomeKit
                //    this.addAccessory(newAccessory);
                //    var respDict = {
                //        "type": "Interface",
                //        "interface": "instruction",
                //        "title": "Success",
                //        "detail": "The new device is now updated.",
                //        "showNextButton": true
                //    };

                //    context.step = 5;
                //    callback(respDict);
                //    break;
                //case 5:
                //    // Update config.json accordingly
                //    var self = this;
                //    delete context.step;
                //    var newConfig = this.config;
                //    var newSwitches = Object.keys(this.accessories).map(function (k) {
                //        var accessory = self.accessories[k];
                //        var data = {
                //            'name': accessory.context.name,
                //            'on_cmd': accessory.context.on_cmd,
                //            'off_cmd': accessory.context.off_cmd,
                //            'state_cmd': accessory.context.state_cmd,
                //            'polling': accessory.context.polling,
                //            'interval': accessory.context.interval,
                //            'manufacturer': accessory.context.manufacturer,
                //            'model': accessory.context.model,
                //            'serial': accessory.context.serial
                //        };
                //        return data;
                //    });

                //    newConfig.switches = newSwitches;
                //    callback(null, "platform", true, newConfig);
                //    break;
        }
    }
}


