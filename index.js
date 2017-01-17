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

        // Store and initialize variables into context
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
                accessory.primaryservice = new Service.TemperatureSensor(accessory.context.name)
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .setProps({ minValue: -55, maxValue: 100 })
                    .on('get', this.getCurrentTemperature.bind(this, accessory.context));
                break;

            case "HumiditySensor":
                accessory.primaryservice = new Service.HumiditySensor(accessory.context.name)
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', this.getCurrentRelativeHumidity.bind(this, accessory.context));
                break;

            case "Contact":
                accessory.primaryservice = new Service.ContactSensor(accessory.context.name)
                    .getCharacteristic(Characteristic.ContactSensorState)
                    .on('get', this.getContactState.bind(this, accessory.context));

            case "LeakSensor":
                accessory.primaryservice = new Service.LeakSensor(accessory.context.name)
                    .getCharacteristic(Characteristic.LeakDetected)
                    .on('get', this.getLeakSensorState.bind(this, accessory.context));
                break;

            case "MotionSensor":
                accessory.primaryservice = new Service.MotionSensor(accessory.context.name)
                    .getCharacteristic(Characteristic.MotionDetected)
                    .on('get', this.getMotionDetected.bind(this, accessory.context));
                break;

            case "Switch":
                accessory.primaryservice = new Service.Switch(accessory.context.name)
                    .getCharacteristic(Characteristic.On)
                    .on('get', this.getSwitchState.bind(this, accessory.context))
                break;

            case "Outlet":
                accessory.primaryservice = new Service.Outlet(accessory.context.name)
                    .getCharacteristic(Characteristic.On)
                    .on('get', this.getOutletState.bind(this, accessory.context))
                    .on('set', this.setOutletState.bind(this, accessory.context));
                break;

            case "AirQualitySensor":
                accessory.primaryservice = new Service.AirQualitySensor(accessory.context.name)
                    .getCharacteristic(Characteristic.AirQuality)
                    .on('get', this.getCurrentAirQuality.bind(this, accessory.context));
                break;

            case "FakeEveAirQualitySensor":
                accessory.primaryservice = new EveRoomService("Eve Room")
                    .getCharacteristic(EveRoomAirQuality)
                    .on('get', this.getCurrentEveAirQuality.bind(this, accessory.context));
                break;

            case "FakeEveWeatherSensor":
                accessory.primaryservice = new EveWeatherService("Eve Weather")
                    .getCharacteristic(EveAirPressure)
                    .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
                break;

            case "FakeEveWeatherSensorWithLog":
                accessory.primaryservice = new EveWeatherService("Eve Weather")
                    .getCharacteristic(EveAirPressure)
                    .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
                break;

            case "Powermeter":
                accessory.primaryservice = new PowerMeterService(accessory.context.name)
                    .getCharacteristic(EvePowerConsumption)
                    .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
                break;

            default:
                this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
                break;
        }

        // Everything outside the primary service gets added as additional characteristics...
        if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
            accessory.primaryservice.addCharacteristic(Characteristic.CurrentTemperature)
                .setProps({ minValue: -55, maxValue: 100 })
                .on('get', this.getCurrentTemperature.bind(this, accessory.context));
        }
        if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
            accessory.primaryservice.addCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this, accessory.context));
        }
        if (accessory.context.valueBattery) {
            accessory.primaryservice.addCharacteristic(Characteristic.BatteryLevel)
                .on('get', this.getCurrentBatteryLevel.bind(this, accessory.context));
        }
        if (accessory.context.lowbattery) {
            accessory.primaryservice.addCharacteristic(Characteristic.StatusLowBattery)
                .on('get', this.getLowBatteryStatus.bind(this, accessory.context));
        }
        // Additional required characteristic for outlet
        if (accessory.context.service == "Outlet") {
            accessory.primaryservice.addCharacteristic(Characteristic.OutletInUse)
                .on('get', this.getOutletInUse.bind(this, accessory.context));
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
            accessory.primaryservice.addCharacteristic(EveAirPressure)
                .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirQuality &&
            (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
            accessory.primaryservice.addCharacteristic(Characteristic.AirQuality)
                .on('get', this.getCurrentEveAirQuality.bind(this, accessory.context));
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
            accessory.primaryservice.addCharacteristic(EvePowerConsumption)
                .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            accessory.primaryservice.addCharacteristic(EveTotalPowerConsumption)
                .on('get', this.getEveTotalPowerConsumption.bind(this, accessory.context));
        }
        
        accessory.on('identify', this.identify.bind(this, accessory.context));

        // Setup HomeKit switch service
        accessory.addService(primaryservice, data.name);

        // New accessory is always reachable
        accessory.reachable = true;

        // Register accessory in HomeKit
        this.api.registerPlatformAccessories("homebridge-domotiga", "DomotiGa", [accessory]);
    }

    // Confirm variable type
    data.polling = data.polling === true;
    data.pollInMs = parseInt(data.pollInMs, 10) || 1;

    // Retrieve initial state
    this.getInitState(accessory);

    // Store accessory in cache
    this.accessories[data.name] = accessory;

    // Configure state polling
    if (data.polling) this.doPolling(data.name);
}


// Method to determine current state
DomotigaPlatform.prototype.doPolling = function (name) {
    this.log("Polling... ");

    var accessory = this.accessories[name];

    // Clear polling
    clearTimeout(this.polling[name]);

    // todo
    //this.updateState(accessory);

    // Setup for next polling
    this.polling[name] = setTimeout(this.doPolling.bind(this, name), accessory.pollInMs * 1000);

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
                accessory.primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
                break;

            case "HumiditySensor":
                accessory.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
                break;


            case "Contact":
                accessory.primaryservice.getCharacteristic(Characteristic.ContactSensorState).getValue();
                break;


            case "LeakSensor":
                accessory.primaryservice.getCharacteristic(Characteristic.LeakDetected).getValue();
                break;


            case "MotionSensor":
                accessory.primaryservice.getCharacteristic(Characteristic.MotionDetected).getValue();
                break;


            case "Switch":
                accessory.primaryservice.getCharacteristic(Characteristic.On).getValue();
                break;


            case "Outlet":
                accessory.primaryservice.getCharacteristic(Characteristic.On).getValue();
                break;


            case "AirQualitySensor":
                accessory.primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
                break;


            case "FakeEveAirQualitySensor":
                accessory.primaryservice.getCharacteristic(EveRoomAirQuality).getValue();
                break;


            case "FakeEveWeatherSensor":
                accessory.primaryservice.getCharacteristic(EveAirPressure).getValue();
                break;


            case "FakeEveWeatherSensorWithLog":
                accessory.primaryservice.getCharacteristic(EveAirPressure).getValue();
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
            accessory.primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
        }
        if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
            accessory.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
        }
        if (accessory.context.valueBattery) {
            accessory.primaryservice.getCharacteristic(Characteristic.BatteryLevel).getValue();
        }
        if (accessory.context.lowbattery) {
            accessory.primaryservice.getCharacteristic(Characteristic.StatusLowBattery).getValue();
        }
        // Additional required characteristic for outlet
        if (accessory.context.service == "Outlet") {
            accessory.primaryservice.getCharacteristic(Characteristic.OutletInUse).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
            accessory.primaryservice.getCharacteristic(EveAirPressure).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirQuality &&
            (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
            accessory.primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
            accessory.primaryservice.getCharacteristic(EvePowerConsumption).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            accessory.primaryservice.getCharacteristic(EveTotalPowerConsumption).getValue();
        }
    }

    // Configured accessory is reachable
    accessory.updateReachability(true);
}

DomotigaPlatform.prototype.updateState = function (thisdevice, callback) {

    if (thisdevice.valueTemperature)
        this.dogetCurrentTemperature(error, thisdevice);

    if (thisdevice.valueHumidity)
        this.dogetCurrentRelativeHumidity(error, thisdevice);

    if (thisdevice.valueContact)
        this.dogetContactState(error, thisdevice);

    if (thisdevice.valueLeakSensor)
        this.dogetLeakSensorState(error, thisdevice);

    if (thisdevice.valueMotionSensor)
        this.dogetMotionDetected(error, thisdevice);

    if (thisdevice.valueSwitch)
        this.dogetSwitchState(error, thisdevice);

    if (thisdevice.valueOutlet) {
        this.dogetOutletState(error, thisdevice);
        this.dogetOutletInUse(error, thisdevice);
    }

    if (thisdevice.valueAirQuality) {
        if (thisdevice.service == "FakeEveAirQualitySensor")
            this.dogetCurrentEveAirQuality(error, thisdevice);
        else
            this.dogetCurrentAirQuality(error, thisdevice);
    }

    if (thisdevice.valueAirPressure)
        this.dogetCurrentAirPressure(error, thisdevice);

    if (thisdevice.valuePowerConsumption)
        this.dogetEvePowerConsumption(error, thisdevice);

    if (thisdevice.valueBattery)
        this.dogetCurrentBatteryLevel(error, thisdevice);

    if (thisdevice.lowbattery)
        this.dogetLowBatteryStatus(error, thisdevice);

    if (thisdevice.valueTotalPowerConsumption)
        this.dogetEveTotalPowerConsumption(error, thisdevice);
}

DomotigaPlatform.prototype.getCurrentTemperature = function (thisdevice, callback) {

    this.log("%s: getting Temperature...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.CurrentTemperature);
    } else {
        this.dogetCurrentTemperature(thisdevice, function (error, state) {
            callback(error, thisdevice.CurrentTemperature);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentTemperature = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueTemperature, function (error, result) {
        if (error) {
            this.log.error('%s: doCurrentTemperature GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            thisdevice.CurrentTemperature = Number(result);
            this.log('%s: CurrentTemperature: %s', thisdevice.name, thisdevice.CurrentTemperature);
            callback(null, thisdevice.CurrentTemperature);
        }
    }.bind(this));
}


DomotigaPlatform.prototype.getCurrentRelativeHumidity = function (thisdevice, callback) {

    this.log("%s: getting CurrentRelativeHumidity...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.CurrentRelativeHumidity);
    } else {
        this.dogetCurrentRelativeHumidity(thisdevice, function (error, state) {
            callback(error, thisdevice.CurrentRelativeHumidity);
        });
    }
}


DomotigaPlatform.prototype.dogetCurrentRelativeHumidity = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueHumidity, function (error, result) {
        if (error) {
            this.log.error('%s: doCurrentRelativeHumidity GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            thisdevice.CurrentRelativeHumidity = Number(result);
            this.log('%s: Humidity: %s', thisdevice.name, thisdevice.CurrentRelativeHumidity);
            callback(null, thisdevice.CurrentRelativeHumidity);
        }
    }.bind(this));
}


DomotigaPlatform.prototype.getTemperatureUnits = function (thisdevice, callback) {
    this.log("%s: getting Temperature unit...", thisdevice.name);
    // 1 = F and 0 = C
    callback(null, 0);
}

DomotigaPlatform.prototype.getCurrentAirPressure = function (thisdevice, callback) {

    this.log("getting CurrentAirPressure for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.CurrentAirPressure);
    } else {
        this.dogetCurrentAirPressure(thisdevice, function (error, state) {
            callback(error, thisdevice.CurrentAirPressure);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentAirPressure = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirPressure, function (error, result) {
        if (error) {
            this.log.error('%s: doCurrentAirPressure GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            thisdevice.CurrentAirPressure = Number(result);
            this.log('%s: CurrentAirPressure: %s', thisdevice.name, thisdevice.CurrentAirPressure);
            callback(null, thisdevice.CurrentAirPressure);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getContactState = function (thisdevice, callback) {

    this.log("%s: getting ContactState...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.ContactState);
    } else {
        this.dogetContactState(thisdevice, function (error, state) {
            callback(error, thisdevice.ContactState);
        });
    }
}

DomotigaPlatform.prototype.dogetContactState = function (thisdevice, callback) {
    this.domotigaGetValue(thisdevice.device, thisdevice.valueContact, function (error, result) {
        if (error) {
            this.log.error('%s: dogetGetContactState GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                thisdevice.ContactState = Characteristic.ContactSensorState.CONTACT_DETECTED;
            else
                thisdevice.ContactState = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

            this.log('%s: ContactState: %s', thisdevice.name, thisdevice.ContactState);
            callback(null, thisdevice.ContactState);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getLeakSensorState = function (thisdevice, callback) {

    this.log("%s: getting LeakSensorState...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.LeakSensorState);
    } else {
        this.dogetLeakSensorState(thisdevice, function (error, state) {
            callback(error, thisdevice.LeakSensorState);
        });
    }
}


DomotigaPlatform.prototype.dogetLeakSensorState = function (thisdevice, callback) {
    this.domotigaGetValue(thisdevice.device, thisdevice.valueLeakSensor, function (error, result) {
        if (error) {
            this.log.error('%s: dogetLeakSensorState GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            if (Number(result) == 0)
                thisdevice.LeakSensorState = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
            else
                thisdevice.LeakSensorState = Characteristic.LeakDetected.LEAK_DETECTED;

            this.log('%s: LeakSensorState: %s', thisdevice.name, thisdevice.LeakSensorState);
            callback(null, thisdevice.LeakSensorState);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getOutletState = function (thisdevice, callback) {

    this.log("%s: getting LeakSensorState...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.outletState);
    } else {
        this.dogetOutletState(thisdevice, function (error, state) {
            callback(error, thisdevice.outletState);
        });
    }
}

DomotigaPlatform.prototype.dogetOutletState = function (thisdevice, callback) {
    this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
        if (error) {
            this.log.error('%s: dogetGetOutletState GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                thisdevice.outletState = 0;
            else
                thisdevice.outletState = 1;

            this.log('%s: outletState: %s', thisdevice.name, thisdevice.outletState);
            callback(null, thisdevice.outletState);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.setOutletState = function (thisdevice, boolvalue, callback) {
    this.log("%s: Setting outlet state to %s", thisdevice.name, boolvalue);

    if (boolvalue == 1)
        thisdevice.outletState = "On";
    else
        thisdevice.outletState = "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisdevice.device, thisdevice.valueOutlet, thisdevice.outletState, function (err) {
        if (callbackWasCalled)
            this.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");

        callbackWasCalled = true;
        if (!err) {
            this.log("%s: Successfully set outlet state to %s", thisdevice.name, thisdevice.outletState);
            callback(null);
        } else {
            this.log.error("%s: Error setting outlet state to %s", thisdevice.name, thisdevice.outletState);
            callback(err);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getOutletInUse = function (thisdevice, callback) {

    this.log("%s: getting OutletInUse...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.OutletInUse);
    } else {
        this.dogetOutletInUse(thisdevice, function (error, state) {
            callback(error, thisdevice.OutletInUse);
        });
    }
}

DomotigaPlatform.prototype.dogetOutletInUse = function (thisdevice, callback) {
    this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
        if (error) {
            this.log.error('%s: dogetOutletInUse GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                thisdevice.OutletInUse = false;
            else
                thisdevice.OutletInUse = true;

            this.log('%s: OutletInUse: %s', thisdevice.name, thisdevice.OutletInUse);
            callback(null, thisdevice.OutletInUse);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentAirQuality = function (thisdevice, callback) {

    this.log("%s: getting airquality...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.CurrentAirQuality);
    } else {
        this.dogetCurrentAirQuality(thisdevice, function (error, state) {
            callback(error, thisdevice.CurrentAirQuality);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentAirQuality = function (thisdevice, callback) {
    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirQuality, function (error, result) {
        if (error) {
            this.log.error('%s: doCurrentAirQuality GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            voc = Number(result);
            this.log('CurrentAirQuality level: %s', voc);
            if (voc > 1500)
                thisdevice.CurrentAirQuality = Characteristic.AirQuality.POOR;
            else if (voc > 1000)
                thisdevice.CurrentAirQuality = Characteristic.AirQuality.INFERIOR;
            else if (voc > 800)
                thisdevice.CurrentAirQuality = Characteristic.AirQuality.FAIR;
            else if (voc > 600)
                thisdevice.CurrentAirQuality = Characteristic.AirQuality.GOOD;
            else if (voc > 0)
                thisdevice.CurrentAirQuality = Characteristic.AirQuality.EXCELLENT;
            else
                thisdevice.CurrentAirQuality = Characteristic.AirQuality.UNKNOWN;

            this.log('%s: CurrentAirQuality: %s', thisdevice.name, thisdevice.CurrentAirQuality);
            callback(null, thisdevice.CurrentAirQuality);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentEveAirQuality = function (thisdevice, callback) {

    this.log("%s: getting Eve room airquality...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.AirQuality);
    } else {
        this.dogetCurrentEveAirQuality(thisdevice, function (error, state) {
            callback(error, thisdevice.AirQuality);
        });
    }
}


// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.dogetCurrentEveAirQuality = function (thisdevice, callback) {
    // Custom Eve intervals:
    //    0... 700 : Exzellent
    //  700...1100 : Good
    // 1100...1600 : Acceptable
    // 1600...2000 : Moderate
    //      > 2000 : Bad	
    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirQuality, function (error, result) {
        if (error) {
            this.log.error('%s: doCurrentEveAirQuality GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            thisdevice.AirQuality = Number(result);
            if (thisdevice.AirQuality < 0)
                thisdevice.AirQuality = 0;

            this.log('%s: CurrentEveAirQuality: %s', thisdevice.name, thisdevice.AirQuality);
            callback(null, thisdevice.AirQuality);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getEvePowerConsumption = function (thisdevice, callback) {

    this.log("%s: getting EvePowerConsumption...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.PowerConsumption);
    } else {
        this.dogetEvePowerConsumption(thisdevice, function (error, state) {
            callback(error, thisdevice.PowerConsumption);
        });
    }
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.dogetEvePowerConsumption = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valuePowerConsumption, function (error, result) {
        if (error) {
            this.log.error('%s: doPowerConsumption GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            thisdevice.PowerConsumption = Math.round(Number(result)); // W

            this.log('%s: PowerConsumption: %s', thisdevice.name, thisdevice.PowerConsumption);
            callback(null, thisdevice.PowerConsumption);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getEveTotalPowerConsumption = function (thisdevice, callback) {

    this.log("%s: getting EvePowerConsumption...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.TotalPowerConsumption);
    } else {
        this.dogetEveTotalPowerConsumption(thisdevice, function (error, state) {
            callback(error, thisdevice.TotalPowerConsumption);
        });
    }
}

// Eve characteristic (custom UUID)   
DomotigaPlatform.prototype.dogetEveTotalPowerConsumption = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueTotalPowerConsumption, function (error, result) {
        if (error) {
            this.log.error('%s: doEveTotalPowerConsumption GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            thisdevice.TotalPowerConsumption = Math.round(Number(result) * 1000.0) / 1000.0; // kWh

            this.log('%s: TotalPowerConsumption: %s', thisdevice.name, thisdevice.TotalPowerConsumption);
            callback(null, thisdevice.TotalPowerConsumption);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentBatteryLevel = function (thisdevice, callback) {

    this.log("%s: getting Battery level...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.CurrentBatteryLevel);
    } else {
        this.dogetCurrentBatteryLevel(thisdevice, function (error, state) {
            callback(error, thisdevice.CurrentBatteryLevel);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentBatteryLevel = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueBattery, function (error, result) {
        if (error) {
            this.log.error('%s: doCurrentBattery GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            thisdevice.lastBatteryLevel = (Number(result));
            //this.log('CurrentBattery level Number(result): %s', Number(result));
            thisdevice.CurrentBatteryLevel = parseInt(thisdevice.lastBatteryLevel * 100 / 5000, 10);
            if (thisdevice.CurrentBatteryLevel > 100)
                thisdevice.CurrentBatteryLevel = 100;
            else if (thisdevice.CurrentBatteryLevel < 0)
                thisdevice.CurrentBatteryLevel = 0;

            this.log('%s: CurrentBattery: %s', thisdevice.name, thisdevice.CurrentBattery);
            callback(null, thisdevice.CurrentBatteryLevel);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getLowBatteryStatus = function (thisdevice, callback) {

    this.log("%s: getting low battery status...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.StatusLowBattery);
    } else {
        this.dogetLowBatteryStatus(thisdevice, function (error, state) {
            callback(error, thisdevice.StatusLowBattery);
        });
    }
}

DomotigaPlatform.prototype.dogetLowBatteryStatus = function (thisdevice, callback) {

    if (thisdevice.lastBatteryLevel < Number(thisdevice.lowbattery))
        thisdevice.StatusLowBattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    else
        thisdevice.StatusLowBattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

    this.log('%s: StatusLowBattery: %s', thisdevice.name, thisdevice.StatusLowBattery);
    //callback(null, thisdevice.StatusLowBattery);
}

DomotigaPlatform.prototype.getMotionDetected = function (thisdevice, callback) {

    this.log("%s: getting MotionDetected...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.MotionDetected);
    } else {
        this.dogetMotionDetected(thisdevice, function (error, state) {
            callback(error, thisdevice.MotionDetected);
        });
    }
}

DomotigaPlatform.prototype.dogetMotionDetected = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueMotionSensor, function (error, result) {
        if (error) {
            this.log.error('%s: dogetMotionDetected GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            if (Number(result) == 0)
                thisdevice.MotionDetected = 1;
            else
                thisdevice.MotionDetected = 0;
            this.log('%s: MotionDetected: %s', thisdevice.name, thisdevice.MotionDetected);
            callback(null, thisdevice.MotionDetected);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getSwitchState = function (thisdevice, callback) {

    this.log("%s: getting SwitchState...", thisdevice.name);
    if (thisdevice.polling) {
        // Get value directly from cache if polling is enabled
        callback(null, thisdevice.switchState);
    } else {
        this.dogetSwitchState(thisdevice, function (error, state) {
            callback(error, thisdevice.switchState);
        });
    }
}

DomotigaPlatform.prototype.dogetSwitchState = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueSwitch, function (error, result) {
        if (error) {
            this.log.error('%s: getSwitchState GetValue failed: %s', thisdevice.name, error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                thisdevice.switchState = 1;
            else
                thisdevice.switchState = 0;

            this.log('%s: switchState: %s', thisdevice.name, thisdevice.switchState);
            callback(null, thisdevice.switchState);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.setSwitchState = function (thisdevice, switchOn, callback) {
    this.log("%s: setting SwitchState to %s", thisdevice.name, switchOn);

    if (switchOn == 1)
        thisdevice.switchState = "On";
    else
        thisdevice.switchState = "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisdevice.device, thisdevice.valueSwitch, thisdevice.switchState, function (err) {
        if (callbackWasCalled) {
            this.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            this.log("%s: Successfully set switch state to %s", thisdevice.name, switchOn);
            callback(null);
        } else {
            this.log.error("%s: Error setting switch state to %s", thisdevice.name, switchOn);
            callback(err);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.identify = function (thisdevice, paired, callback) {
    this.log("%s: Identify requested", thisdevice.name);
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

//// Get value from domotiga database
//DomotigaPlatform.prototype.domotigaGetValue = function (device, deviceValueNo, callback) {

//    JSONRequest('http://' + this.host + ':' + this.port, {
//        jsonrpc: "2.0",
//        method: "device.get",
//        params: {
//            "device_id": device
//        },
//        id: 1
//    }, function (err, data) {
//        if (err) {
//            //this.log.error("Sorry err: ", err);
//            callback(err);
//        } else {
//            item = Number(deviceValueNo) - 1;
//            //this.log("data.result:", data.result);
//            //this.log( "data.result.values[item].value", data.result.values[item].value);
//            callback(null, data.result.values[item].value);
//        }
//    });
//}

// Get value from domotiga database
DomotigaPlatform.prototype.domotigaGetValue = function (device, deviceValueNo, callback) {
    
    var self = this;

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
            item = Number(deviceValueNo) - 1;
            //self.log("data.result:", data.result);
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

