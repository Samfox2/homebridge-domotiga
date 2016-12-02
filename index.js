//"use strict";
var Accessory, Service, Characteristic, UUIDGen;
var JSONRequest = require("jsonrequest");
var inherits = require('util').inherits;
var pollingtoevent = require('polling-to-event');

module.exports = function (homebridge) {

    Accessory = homebridge.platformAccessory;
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

    homebridge.registerPlatform("homebridge-domotiga", "DomotiGa", DomotigaPlatform);
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
    for (var i in this.devices) {
        var data = this.devices[i];
        this.log("Adding device: " + data.name);
        this.addAccessory(data);
    }

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

        // New accessory is always reachable
        accessory.reachable = true;

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

	var primaryservice;
	    
        // Setup HomeKit service(-s)
        switch (accessory.context.service) {

            case "TemperatureSensor":
               primaryservice = new Service.TemperatureSensor(accessory.context.service);
                break;

            case "HumiditySensor":
                primaryservice = new Service.HumiditySensor(accessory.context.service);
                break;

            case "Contact":
                primaryservice = new Service.ContactSensor(accessory.context.service);
                this.primaryValue = this.config.valueContact;
                break;

            case "LeakSensor":
                primaryservice = new Service.LeakSensor(accessory.context.service);
                this.primaryValue = this.config.valueLeakSensor;
                break;

            case "MotionSensor":
                primaryservice = new Service.MotionSensor(accessory.context.service);
                this.primaryValue = this.config.valueMotionSensor;
                break;

            case "Switch":
                primaryservice = new Service.Switch(accessory.context.service);
                this.primaryValue = this.config.valueSwitch;
                break;

            case "Outlet":
                primaryservice = new Service.Outlet(accessory.context.service);
                this.primaryValue = this.config.valueOutlet;
                break;

            case "AirQualitySensor":
                primaryservice = new Service.AirQualitySensor(accessory.context.service);
                break;

            case "FakeEveAirQualitySensor":
                this.primaryservice = new EveRoomService("Eve Room");
                break;

            case "FakeEveWeatherSensor":
                primaryservice = new EveWeatherService("Eve Weather");
                break;

            case "FakeEveWeatherSensorWithLog":
                primaryservice = new EveWeatherService("Eve Weather");
                break;

            case "Powermeter":
                primaryservice = new PowerMeterService(accessory.context.service);
                break;

            default:
                this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
                break;
        }

        // Everything outside the primary service gets added as optional characteristics...
        if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
            primaryservice.addCharacteristic(Characteristic.CurrentTemperature);
        }
        if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
            primaryservice.addCharacteristic(Characteristic.CurrentRelativeHumidity);
        }
        if (accessory.context.valueBattery) {
            primaryservice.addCharacteristic(Characteristic.BatteryLevel);
        }
        if (accessory.context.lowbattery) {
            primaryservice.addCharacteristic(Characteristic.StatusLowBattery);
        }
        // Additional required characteristic for outlet
        if (accessory.context.service == "Outlet") {
            primaryservice.getCharacteristic(Characteristic.OutletInUse);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
            primaryservice.addCharacteristic(EveAirPressure);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirQuality &&
            (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
            primaryservice.addCharacteristic(Characteristic.AirQuality);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
            primaryservice.addCharacteristic(EvePowerConsumption);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            primaryservice.addCharacteristic(EveTotalPowerConsumption);
        }

        // Setup HomeKit switch service
        accessory.addService(primaryservice, data.name);
	    
        // Setup listeners for different switch events
        this.setService(accessory);

        // Register accessory in HomeKit
        this.api.registerPlatformAccessories("homebridge-domotiga", "DomotiGa", [accessory]);
    }

    // Confirm variable type
    if (data.polling === true || (typeof (data.polling) === "string" && data.polling.toUpperCase() === "TRUE")) {
        data.polling = true;
    } else {
        data.polling = false;
    }
    data.pollInMs = parseInt(data.pollInMs) || 1;

	
    // Retrieve initial state
    this.getInitState(accessory);

    // Store accessory in cache
    this.accessories[data.name] = accessory;

    // todo:
    // Configure state polling
    //if (data.polling) this.statePolling(data.name);
}

// todo: polling
//// Method to determine current state
//DomotigaPlatform.prototype.statePolling = function (name) {
//    var self = this;
//    var accessory = this.accessories[name];
//    var thisSwitch = accessory.context;

//    this.getState(thisSwitch, function (error, state) {
//        // Update state if there's no error
//        if (!error && state !== thisSwitch.state) {
//            thisSwitch.state = state;
//            accessory.getService(Service.Switch)
//              .getCharacteristic(Characteristic.On)
//              .getValue();
//        }
//    });

//    // Setup for next polling
//    setTimeout(this.statePolling.bind(this, name), thisSwitch.pollInMs * 1000);
//}


DomotigaPlatform.prototype.removeAccessory = function (accessory) {
    if (accessory) {
        var name = accessory.context.name;
        this.log.warn("Removing Domotigadevice: " + name + ". No longer reachable or configured.");
        this.api.unregisterPlatformAccessories("homebridge-domotiga", "DomotiGa", [accessory]);
        delete this.accessories[name];
    }
}

// Method to setup listeners for different events
DomotigaPlatform.prototype.setService = function (accessory) {

    // Create primary service
    var primaryservice;

    switch (accessory.context.service) {

	case "TemperatureSensor":
            primaryservice = accessory.getService(Service.TemperatureSensor);
            primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
		.setProps({ minValue: -55, maxValue: 100 })
                .on('get', this.getCurrentTemperature.bind(this, accessory.context));
            break;

        case "HumiditySensor":
            primaryservice = accessory.getService(Service.HumiditySensor);
            primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this, accessory.context));
            break;

        case "Contact":
            primaryservice = accessory.getService(Service.ContactSensor);
            primaryservice.getCharacteristic(Characteristic.ContactSensorState)
                .on('get', this.getContactState.bind(this, accessory.context));
            this.primaryValue = this.config.valueContact;
            break;

        case "LeakSensor":
            primaryservice = accessory.getService(Service.LeakSensor);
            primaryservice.getCharacteristic(Characteristic.LeakDetected)
                .on('get', this.getLeakSensorState.bind(this, accessory.context));
            this.primaryValue = this.config.valueLeakSensor;
            break;

        case "MotionSensor":
            primaryservice = accessory.getService(Service.MotionSensor);
            primaryservice.getCharacteristic(Characteristic.MotionDetected)
                .on('get', this.getMotionDetected.bind(this, accessory.context));
            this.primaryValue = this.config.valueMotionSensor;
            break;

        case "Switch":
            primaryservice = accessory.getService(Service.Switch);
            primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getSwitchState.bind(this, accessory.context))
                .on('set', this.setSwitchState.bind(this, accessory.context));
            this.primaryValue = this.config.valueSwitch;
            break;

        case "Outlet":
            primaryservice = accessory.getService(Service.Outlet);
            primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getOutletState.bind(this, accessory.context))
                .on('set', this.setOutletState.bind(this, accessory.context));
            this.primaryValue = this.config.valueOutlet;
            break;

        case "AirQualitySensor":
            primaryservice = accessory.getService(Service.AirQualitySensor);
            primaryservice.getCharacteristic(Characteristic.AirQuality)
                .on('get', this.getCurrentAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveAirQualitySensor":
            primaryservice = accessory.getService(EveRoomService);
            primaryservice.getCharacteristic(EveRoomAirQuality)
                .on('get', this.getCurrentEveAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveWeatherSensor":
            primaryservice = accessory.getService(EveWeatherService);
            primaryservice.getCharacteristic(EveAirPressure)
                .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
            break;

        case "FakeEveWeatherSensorWithLog":
            primaryservice = accessory.getService(EveWeatherService);
            primaryservice.getCharacteristic(EveAirPressure)
                .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
            break;

        case "Powermeter":
            primaryservice = accessory.getService(PowerMeterService);
            primaryservice.getCharacteristic(EvePowerConsumption)
                .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
            break;
            // for testing purposes only:
        default:
            this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
            break;
    }


    // Everything outside the primary service gets added as optional characteristics...
    if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
        primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
	    .setProps({ minValue: -55, maxValue: 100 })
            .on('get', this.getCurrentTemperature.bind(this, accessory.context));
    }
    if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
        primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getCurrentRelativeHumidity.bind(this, accessory.context));
    }
    if (accessory.context.valueBattery) {
        primaryservice.getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this.getCurrentBatteryLevel.bind(this, accessory.context));
    }
    if (accessory.context.lowbattery) {
        primaryservice.getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', this.getLowBatteryStatus.bind(this, accessory.context));
    }
    // Additional required characteristic for outlet
    if (accessory.context.service == "Outlet") {
        primaryservice.getCharacteristic(Characteristic.OutletInUse)
            .on('get', this.getOutletInUse.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirPressure &&
        (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
        primaryservice.getCharacteristic(EveAirPressure)
            .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirQuality &&
        (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
        primaryservice.getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getCurrentEveAirQuality.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
        primaryservice.getCharacteristic(EvePowerConsumption)
            .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueTotalPowerConsumption) {
        primaryservice.getCharacteristic(EveTotalPowerConsumption)
            .on('get', this.getEveTotalPowerConsumption.bind(this, accessory.context));
    }

    accessory.on('identify', this.identify.bind(this, accessory.context));
}


DomotigaPlatform.prototype.getInitState = function (accessory) {

    // Update HomeKit accessory information
    accessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer)
        .setCharacteristic(Characteristic.Model, accessory.context.model)
        .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + accessory.context.device + accessory.context.name));

    // Retrieve initial state if polling is disabled
    if (!accessory.context.polling) {

        // Create primary service
        switch (accessory.context.service) {

            case "TemperatureSensor":
                accessory.getService(Service.TemperatureSensor)
                    .getCharacteristic(Characteristic.CurrentTemperature).getValue();
                break;

            case "HumiditySensor":
                accessory.getService(Service.HumiditySensor)
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
                break;


            case "Contact":
                accessory.getService(Service.ContactSensor)
                    .getCharacteristic(Characteristic.ContactSensorState).getValue();
                break;


            case "LeakSensor":
                accessory.getService(Service.LeakSensor)
                    .getCharacteristic(Characteristic.LeakDetected).getValue();
                break;


            case "MotionSensor":
                accessory.getService(Service.MotionSensor)
                    .getCharacteristic(Characteristic.MotionDetected).getValue();
                break;


            case "Switch":
                accessory.getService(Service.Switch)
                    .getCharacteristic(Characteristic.On).getValue();
                break;


            case "Outlet":
                accessory.getService(Service.Outlet)
                    .getCharacteristic(Characteristic.On).getValue();
                break;


            case "AirQualitySensor":
                accessory.getService(Service.AirQualitySensor)
                    .getCharacteristic(Characteristic.AirQuality).getValue();
                break;


            case "FakeEveAirQualitySensor":
                accessory.getService(Service.EveRoomService)
                    .getCharacteristic(EveRoomAirQuality).getValue();
                break;


            case "FakeEveWeatherSensor":
                accessory.getService(Service.EveWeatherService)
                    .getCharacteristic(EveAirPressure).getValue();
                break;


            case "FakeEveWeatherSensorWithLog":
                accessory.getService(Service.EveWeatherService)
                    .getCharacteristic(EveAirPressure).getValue();
                break;

            case "Powermeter":
                accessory.getService(Service.PowerMeterService)
                    .getCharacteristic(EvePowerConsumption).getValue();
                break;

            default:
                this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
                break;
        }
    }
}

DomotigaPlatform.prototype.getCurrentTemperature = function (thisdevice, callback) {

    this.log("getting Temperature for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueTemperature, function (error, result) {
        if (error) {
            this.log.error('CurrentTemperature GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(error, Number(result));
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentRelativeHumidity = function (thisdevice, callback) {

    this.log("getting CurrentRelativeHumidity for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueHumidity, function (error, result) {
        if (error) {
            this.log.error('CurrentRelativeHumidity GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(error, Number(result));
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getTemperatureUnits = function (thisdevice, callback) {
    this.log("getting Temperature unit for " + thisdevice.name);
    // 1 = F and 0 = C
    callback(null, 0);
}

DomotigaPlatform.prototype.getCurrentAirPressure = function (thisdevice, callback) {
    this.log("getting CurrentAirPressure for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirPressure, function (error, result) {
        if (error) {
            this.log.error('CurrentAirPressure GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(null, Number(result));
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getContactState = function (thisdevice, callback) {
    this.log("getting ContactState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueContact, function (error, result) {
        if (error) {
            this.log.error('getGetContactState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
            else
                callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getLeakSensorState = function (thisdevice, callback) {
    this.log("getting LeakSensorState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueLeakSensor, function (error, result) {
        if (error) {
            this.log.error('getLeakSensorState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (Number(result) == 0)
                callback(null, Characteristic.LeakDetected.LEAK_NOT_DETECTED);
            else
                callback(null, Characteristic.LeakDetected.LEAK_DETECTED);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getOutletState = function (thisdevice, callback) {
    this.log("getting OutletState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
        if (error) {
            this.log.error('getGetOutletState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, 0);
            else
                callback(null, 1);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.setOutletState = function (thisdevice, boolvalue, callback) {
    this.log("Setting outlet state for '%s' to %s", thisdevice.name, boolvalue);

    if (boolvalue == 1)
        outletState = "On";
    else
        outletState = "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisdevice.device, thisdevice.valueOutlet, outletState, function (err) {
        if (callbackWasCalled)
            this.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");

        callbackWasCalled = true;
        if (!err) {
            this.log("Successfully set outlet state on the '%s' to %s", thisdevice.name, outletState);
            callback(null);
        } else {
            this.log.error("Error setting outlet state to %s on the '%s'", outletState, thisdevice.name);
            callback(err);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getOutletInUse = function (thisdevice, callback) {
    this.log("getting OutletInUse for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
        if (error) {
            this.log.error('getOutletInUse GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, false);
            else
                callback(null, true);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentAirQuality = function (thisdevice, callback) {
    this.log("getting airquality for " + thisdevice.name);

    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirQuality, function (error, result) {
        if (error) {
            this.log.error('CurrentAirQuality GetValue failed: %s', error.message);
            callback(error);
        } else {
            voc = Number(result);
            this.log('CurrentAirQuality level: %s', voc);
            if (voc > 1500)
                callback(null, Characteristic.AirQuality.POOR);
            else if (voc > 1000)
                callback(null, Characteristic.AirQuality.INFERIOR);
            else if (voc > 800)
                callback(null, Characteristic.AirQuality.FAIR);
            else if (voc > 600)
                callback(null, Characteristic.AirQuality.GOOD);
            else if (voc > 0)
                callback(null, Characteristic.AirQuality.EXCELLENT);
            else
                callback(null, Characteristic.AirQuality.UNKNOWN);
        }
    }.bind(this));
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.getCurrentEveAirQuality = function (thisdevice, callback) {
    // Custom Eve intervals:
    //    0... 700 : Exzellent
    //  700...1100 : Good
    // 1100...1600 : Acceptable
    // 1600...2000 : Moderate
    //      > 2000 : Bad	
    this.log("getting Eve room airquality for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirQuality, function (error, result) {
        if (error) {
            this.log.error('CurrentEveAirQuality GetValue failed: %s', error.message);
            callback(error);
        } else {
            voc = Number(result);
            if (voc < 0)
                voc = 0;
            callback(null, voc);
        }
    }.bind(this));
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.getEvePowerConsumption = function (thisdevice, callback) {
    this.log("getting EvePowerConsumption for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valuePowerConsumption, function (error, result) {
        if (error) {
            this.log.error('PowerConsumption GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(null, Math.round(Number(result))); // W
        }
    }.bind(this));
}

// Eve characteristic (custom UUID)   
DomotigaPlatform.prototype.getEveTotalPowerConsumption = function (thisdevice, callback) {
    this.log("getting EveTotalPowerConsumption for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueTotalPowerConsumption, function (error, result) {
        if (error) {
            this.log.error('EveTotalPowerConsumption GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(null, Math.round(Number(result) * 1000.0) / 1000.0); // kWh
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentBatteryLevel = function (thisdevice, callback) {
    this.log("getting Battery level for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueBattery, function (error, result) {
        if (error) {
            this.log.error('CurrentBattery GetValue failed: %s', error.message);
            callback(error);
        } else {
            //this.log('CurrentBattery level Number(result): %s', Number(result));
            remaining = parseInt(Number(result) * 100 / 5000, 10);
            this.log('CurrentBattery level: %s', remaining);
            if (remaining > 100)
                remaining = 100;
            else if (remaining < 0)
                remaining = 0;
            callback(null, remaining);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getLowBatteryStatus = function (thisdevice, callback) {
    this.log("getting BatteryStatus for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueBattery, function (error, result) {
        if (error) {
            this.log.error('BatteryStatus GetValue failed: %s', error.message);
            callback(error);
        } else {
            var value = Number(result);
            if (isNaN(value) || value < Number(thisdevice.lowbattery))
                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
            else
                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getMotionDetected = function (thisdevice, callback) {
    this.log("getting MotionDetected for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueMotionSensor, function (error, result) {
        if (error) {
            this.log.error('getMotionDetected GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (Number(result) == 0)
                callback(null, 0);
            else
                callback(null, 1);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getSwitchState = function (thisdevice, callback) {
    this.log("getting SwitchState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueSwitch, function (error, result) {
        if (error) {
            this.log.error('getSwitchState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, 1);
            else
                callback(null, 0);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.setSwitchState = function (thisdevice, switchOn, callback) {
    this.log("Setting SwitchState for '%s' to %s", thisdevice.name, switchOn);

    if (switchOn == 1)
        switchState = "On";
    else
        switchState = "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisdevice.device, thisdevice.valueSwitch, switchState, function (err) {
        if (callbackWasCalled) {
            this.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            this.log("Successfully set switch state on the '%s' to %s", thisdevice.name, switchOn);
            callback(null);
        } else {
            this.log.error("Error setting switch state to %s on the '%s'", switchOn, thisdevice.name);
            callback(err);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.identify = function (thisdevice, paired, callback) {
    this.log("Identify requested for " + thisdevice.name);
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

    JSONRequest('http://' + this.host + ':' + this.port, {
        jsonrpc: "2.0",
        method: "device.get",
        params: {
            "device_id": device
        },
        id: 1
    }, function (err, data) {
        if (err) {
            this.log.error("Sorry err: ", err);
            callback(err);
        } else {
            item = Number(deviceValueNo) - 1;
            //this.log("data.result:", data.result);
            //this.log( "data.result.values[item].value", data.result.values[item].value);
            callback(null, data.result.values[item].value);
        }
    });
}

//DomotigaPlatform.prototype.readState = function (message) {
//    return (message.readUInt8(129)) ? true : false;
//}

//DomotigaPlatform.prototype.readName = function (message) {
//    return (message.toString('ascii', 48, 79));
//}





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
                            var title = "Witch device do you want to modify?";
                            context.operation = 1;
                        } else {
                            var title = "Witch device do you want to remove?";
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

