//"use strict";
var Accessory, Service, Characteristic, UUIDGen;
var JSONRequest = require("jsonrequest");
var inherits = require('util').inherits;

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
                primaryservice = new Service.TemperatureSensor(accessory.context.name);
                break;

            case "HumiditySensor":
                primaryservice = new Service.HumiditySensor(accessory.context.name);
                break;

            case "Contact":
                primaryservice = new Service.ContactSensor(accessory.context.name);
                break;

            case "LeakSensor":
                primaryservice = new Service.LeakSensor(accessory.context.name);
                break;

            case "MotionSensor":
                primaryservice = new Service.MotionSensor(accessory.context.name);
                break;

            case "Switch":
                primaryservice = new Service.Switch(accessory.context.name);
                break;

            case "Outlet":
                primaryservice = new Service.Outlet(accessory.context.name);
                break;

            case "AirQualitySensor":
                primaryservice = new Service.AirQualitySensor(accessory.context.name);
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
                primaryservice = new PowerMeterService(accessory.context.name);
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
            primaryservice.addCharacteristic(Characteristic.OutletInUse);
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
    if (data.polling) this.doPolling(data.name);
}


// Method to determine current state
DomotigaPlatform.prototype.doPolling = function (name) {
    var accessory = this.accessories[name];

    // Clear polling
    clearTimeout(this.polling[name]);

    this.updateState(accessory);

    // Setup for next polling
    this.polling[name] = setTimeout(this.doPolling.bind(this, name), accessory.pollInMs * 1000);

}


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
            break;

        case "LeakSensor":
            primaryservice = accessory.getService(Service.LeakSensor);
            primaryservice.getCharacteristic(Characteristic.LeakDetected)
                .on('get', this.getLeakSensorState.bind(this, accessory.context));
            break;

        case "MotionSensor":
            primaryservice = accessory.getService(Service.MotionSensor);
            primaryservice.getCharacteristic(Characteristic.MotionDetected)
                .on('get', this.getMotionDetected.bind(this, accessory.context));
            break;

        case "Switch":
            primaryservice = accessory.getService(Service.Switch);
            primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getSwitchState.bind(this, accessory.context))
            break;

        case "Outlet":
            primaryservice = accessory.getService(Service.Outlet);
            primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getOutletState.bind(this, accessory.context))
                .on('set', this.setOutletState.bind(this, accessory.context));
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


    // Additional/optional characteristics...
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

        // Get primary service
        var primaryservice;

        // Create primary service
        switch (accessory.context.service) {

            case "TemperatureSensor":
                primaryservice = accessory.getService(Service.TemperatureSensor);
                primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
                break;

            case "HumiditySensor":
                primaryservice = accessory.getService(Service.HumiditySensor);
                primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
                break;


            case "Contact":
                primaryservice = accessory.getService(Service.ContactSensor);
                primaryservice.getCharacteristic(Characteristic.ContactSensorState).getValue();
                break;


            case "LeakSensor":
                primaryservice = accessory.getService(Service.LeakSensor);
                primaryservice.getCharacteristic(Characteristic.LeakDetected).getValue();
                break;


            case "MotionSensor":
                primaryservice = accessory.getService(Service.MotionSensor);
                primaryservice.getCharacteristic(Characteristic.MotionDetected).getValue();
                break;


            case "Switch":
                primaryservice = accessory.getService(Service.Switch);
                primaryservice.getCharacteristic(Characteristic.On).getValue();
                break;


            case "Outlet":
                primaryservice = accessory.getService(Service.Outlet);
                primaryservice.getCharacteristic(Characteristic.On).getValue();
                break;


            case "AirQualitySensor":
                primaryservice = accessory.getService(Service.AirQualitySensor);
                primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
                break;


            case "FakeEveAirQualitySensor":
                primaryservice = accessory.getService(EveRoomService);
                primaryservice.getCharacteristic(EveRoomAirQuality).getValue();
                break;


            case "FakeEveWeatherSensor":
                primaryservice = accessory.getService(EveWeatherService);
                primaryservice.getCharacteristic(EveAirPressure).getValue();
                break;


            case "FakeEveWeatherSensorWithLog":
                primaryservice = accessory.getService(EveWeatherService);
                primaryservice.getCharacteristic(EveAirPressure).getValue();
                break;

            case "Powermeter":
                primaryservice = accessory.getService(PowerMeterService);
                primaryservice.getCharacteristic(EvePowerConsumption).getValue();
                break;

            default:
                this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
                break;
        }

        // Additional/optional characteristics...
        if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
            primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
        }
        if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
            primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
        }
        if (accessory.context.valueBattery) {
            primaryservice.getCharacteristic(Characteristic.BatteryLevel).getValue();
        }
        if (accessory.context.lowbattery) {
            primaryservice.getCharacteristic(Characteristic.StatusLowBattery).getValue();
        }
        // Additional required characteristic for outlet
        if (accessory.context.service == "Outlet") {
            primaryservice.getCharacteristic(Characteristic.OutletInUse).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
            primaryservice.getCharacteristic(EveAirPressure).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirQuality &&
            (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
            primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
            primaryservice.getCharacteristic(EvePowerConsumption).getValue();
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            primaryservice.getCharacteristic(EveTotalPowerConsumption).getValue();
        }
    }
}

DomotigaPlatform.prototype.updateState = function (accessory) {

    if (accessory.context.valueTemperature)
        this.dogetCurrentTemperature(accessory);

    if (accessory.context.valueHumidity)
        this.dogetCurrentRelativeHumidity(accessory);

    if (accessory.context.valueContact)
        this.dogetContactState(accessory);

    if (accessory.context.valueLeakSensor)
        this.dogetLeakSensorState(accessory);

    if (accessory.context.valueMotionSensor)
        this.dogetMotionDetected(accessory);

    if (accessory.context.valueSwitch)
        this.dogetSwitchState(accessory);

    if (accessory.context.valueOutlet) {
        this.dogetOutletState(accessory);
        this.dogetOutletInUse(accessory);
    }

    if (accessory.context.valueAirQuality) {
        if (accessory.context.service == "FakeEveAirQualitySensor")
            this.dogetCurrentEveAirQuality(accessory);
        else
            this.dogetCurrentAirQuality(accessory);
    }

    if (accessory.context.valueAirPressure)
        this.dogetCurrentAirPressure(accessory);
    
    if (accessory.context.valuePowerConsumption)
        this.dogetEvePowerConsumption(accessory);
    
    if (accessory.context.valueBattery)
        this.dogetCurrentBatteryLevel(accessory);

    if (accessory.context.lowbattery)
        this.dogetLowBatteryStatus(accessory);

    if (accessory.context.valueTotalPowerConsumption)
        this.dogetEveTotalPowerConsumption(accessory);
}

DomotigaPlatform.prototype.getCurrentTemperature = function (thisdevice, callback) {

    this.log("getting Temperature for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.CurrentTemperature);
    } else {
        this.dogetCurrentTemperature(thisdevice, function (error, state) {
            //thisdevice.CurrentTemperature = state;
            callback(error, thisdevice.CurrentTemperature);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentTemperature = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueTemperature, function (error, result) {
        if (error) {
            this.log.error('CurrentTemperature GetValue failed: %s', error.message);
            callback(error);
        } else {
            thisdevice.CurrentTemperature = Number(result);
            callback(error, thisdevice.CurrentTemperature);
        }
    }.bind(this));
}


DomotigaPlatform.prototype.getCurrentRelativeHumidity = function (thisdevice, callback) {

    this.log("getting CurrentRelativeHumidity for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.CurrentRelativeHumidity);
    } else {
        this.dogetCurrentRelativeHumidity(thisdevice, function (error, state) {
            //thisdevice.CurrentRelativeHumidity = state;
            callback(error, thisdevice.CurrentRelativeHumidity);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentRelativeHumidity = function (thisdevice, callback) {

    this.domotigaGetValue(thisdevice.device, thisdevice.valueHumidity, function (error, result) {
        if (error) {
            this.log.error('CurrentRelativeHumidity GetValue failed: %s for %s', error.message, thisdevice.name);
            callback(error);
        } else {
            thisdevice.CurrentRelativeHumidity = Number(result);
            callback(error, thisdevice.CurrentRelativeHumidity);
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
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.CurrentAirPressure);
    } else {
        this.dogetCurrentAirPressure(thisdevice, function (error, state) {
            //thisdevice.CurrentAirPressure = state;
            callback(error, thisdevice.CurrentAirPressure);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentAirPressure = function (thisdevice, callback) {

        this.domotigaGetValue(thisdevice.device, thisdevice.valueAirPressure, function (error, result) {
            if (error) {
                this.log.error('CurrentAirPressure GetValue failed: %s', error.message);
                callback(error);
            } else {
                thisdevice.CurrentAirPressure = Number(result);
                callback(null, thisdevice.CurrentAirPressure);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getContactState = function (thisdevice, callback) {

    this.log("getting ContactState for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.ContactState);
    } else {
        this.dogetContactState(thisdevice, function (error, state) {
            //thisdevice.ContactState = state;
            callback(error, thisdevice.ContactState);
        });
    }
}

DomotigaPlatform.prototype.dogetContactState = function (thisdevice, callback) {
        this.domotigaGetValue(thisdevice.device, thisdevice.valueContact, function (error, result) {
            if (error) {
                this.log.error('getGetContactState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    thisdevice.ContactState = Characteristic.ContactSensorState.CONTACT_DETECTED;
                else
                    thisdevice.ContactState = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                callback(null, thisdevice.ContactState);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getLeakSensorState = function (thisdevice, callback) {

    this.log("getting LeakSensorState for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.LeakSensorState);
    } else {
        this.dogetLeakSensorState(thisdevice, function (error, state) {
            //thisdevice.LeakSensorState = state;
            callback(error, thisdevice.LeakSensorState);
        });
    }
}


DomotigaPlatform.prototype.dogetLeakSensorState = function (thisdevice, callback) {
        this.domotigaGetValue(thisdevice.device, thisdevice.valueLeakSensor, function (error, result) {
            if (error) {
                this.log.error('getLeakSensorState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (Number(result) == 0)
                    thisdevice.LeakSensorState = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
                else
                    thisdevice.LeakSensorState = Characteristic.LeakDetected.LEAK_DETECTED;
                callback(null, thisdevice.LeakSensorState);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getOutletState = function (thisdevice, callback) {

    this.log("getting LeakSensorState for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.outletState);
    } else {
        this.dogetOutletState(thisdevice, function (error, state) {
            //thisdevice.outletState = state;
            callback(error, thisdevice.outletState);
        });
    }
}

DomotigaPlatform.prototype.dogetOutletState = function (thisdevice, callback) {
        this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
            if (error) {
                this.log.error('getGetOutletState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    thisdevice.outletState = 0;
                else
                    thisdevice.outletState = 1;
                callback(null, thisdevice.outletState);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.setOutletState = function (thisdevice, boolvalue, callback) {
    this.log("Setting outlet state for '%s' to %s", thisdevice.name, boolvalue);

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
            this.log("Successfully set outlet state on the '%s' to %s", thisdevice.name, thisdevice.outletState);
            callback(null);
        } else {
            this.log.error("Error setting outlet state to %s on the '%s'", thisdevice.outletState, thisdevice.name);
            callback(err);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getOutletInUse = function (thisdevice, callback) {

    this.log("getting OutletInUse for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.OutletInUse);
    } else {
        this.dogetOutletInUse(thisdevice, function (error, state) {
            //thisdevice.OutletInUse = state;
            callback(error, thisdevice.OutletInUse);
        });
    }
}

DomotigaPlatform.prototype.dogetOutletInUse = function (thisdevice, callback) {
        this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
            if (error) {
                this.log.error('getOutletInUse GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    thisdevice.OutletInUse = false;
                else
                    thisdevice.OutletInUse = true;
                callback(null, thisdevice.OutletInUse);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getCurrentAirQuality = function (thisdevice, callback) {

    this.log("getting airquality for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.CurrentAirQuality);
    } else {
        this.dogetCurrentAirQuality(thisdevice, function (error, state) {
            //thisdevice.CurrentAirQuality = state;
            callback(error, thisdevice.CurrentAirQuality);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentAirQuality = function (thisdevice, callback) {
        this.domotigaGetValue(thisdevice.device, thisdevice.valueAirQuality, function (error, result) {
            if (error) {
                this.log.error('CurrentAirQuality GetValue failed: %s', error.message);
                callback(error);
            } else {
                voc = Number(result);
                this.log('CurrentAirQuality level: %s', voc);
                if (voc > 1500)
                    thisdevice.CurrentAirQuality =  Characteristic.AirQuality.POOR;
                else if (voc > 1000)
                    thisdevice.CurrentAirQuality =  Characteristic.AirQuality.INFERIOR;
                else if (voc > 800)
                    thisdevice.CurrentAirQuality =  Characteristic.AirQuality.FAIR;
                else if (voc > 600)
                    thisdevice.CurrentAirQuality =  Characteristic.AirQuality.GOOD;
                else if (voc > 0)
                    thisdevice.CurrentAirQuality =  Characteristic.AirQuality.EXCELLENT;
                else
                    thisdevice.CurrentAirQuality = Characteristic.AirQuality.UNKNOWN;

               callback(null, thisdevice.CurrentAirQuality);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getCurrentEveAirQuality = function (thisdevice, callback) {

    this.log("getting Eve room airquality for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.AirQuality);
    } else {
        this.dogetCurrentEveAirQuality(thisdevice, function (error, state) {
            //thisdevice.AirQuality = state;
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
                this.log.error('CurrentEveAirQuality GetValue failed: %s', error.message);
                callback(error);
            } else {
                thisdevice.AirQuality = Number(result);
                if (thisdevice.AirQuality < 0)
                    thisdevice.AirQuality = 0;

                callback(null, thisdevice.AirQuality);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getEvePowerConsumption = function (thisdevice, callback) {

    this.log("getting EvePowerConsumption for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.PowerConsumption);
    } else {
        this.dogetEvePowerConsumption(thisdevice, function (error, state) {
            //thisdevice.PowerConsumption = state;
            callback(error, thisdevice.PowerConsumption);
        });
    }
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.dogetEvePowerConsumption = function (thisdevice, callback) {

        this.domotigaGetValue(thisdevice.device, thisdevice.valuePowerConsumption, function (error, result) {
            if (error) {
                this.log.error('PowerConsumption GetValue failed: %s', error.message);
                callback(error);
            } else {
                thisdevice.PowerConsumption = Math.round(Number(result)); // W
                callback(null, thisdevice.PowerConsumption);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getEveTotalPowerConsumption = function (thisdevice, callback) {

    this.log("getting EvePowerConsumption for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.TotalPowerConsumption);
    } else {
        this.dogetEveTotalPowerConsumption(thisdevice, function (error, state) {
            //thisdevice.TotalPowerConsumption = state;
            callback(error, thisdevice.TotalPowerConsumption);
        });
    }
}

// Eve characteristic (custom UUID)   
DomotigaPlatform.prototype.dogetEveTotalPowerConsumption = function (thisdevice, callback) {

        this.domotigaGetValue(thisdevice.device, thisdevice.valueTotalPowerConsumption, function (error, result) {
            if (error) {
                this.log.error('EveTotalPowerConsumption GetValue failed: %s', error.message);
                callback(error);
            } else {
                thisdevice.TotalPowerConsumption = Math.round(Number(result) * 1000.0) / 1000.0; // kWh
                callback(null, thisdevice.TotalPowerConsumption);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getCurrentBatteryLevel = function (thisdevice, callback) {

    this.log("getting Battery level for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.StatusLowBattery);
    } else {
        this.dogetCurrentBatteryLevel(thisdevice, function (error, state) {
            //thisdevice.StatusLowBattery = state;
            callback(error, thisdevice.StatusLowBattery);
        });
    }
}

DomotigaPlatform.prototype.dogetCurrentBatteryLevel = function (thisdevice, callback) {

        this.domotigaGetValue(thisdevice.device, thisdevice.valueBattery, function (error, result) {
            if (error) {
                this.log.error('CurrentBattery GetValue failed: %s', error.message);
                callback(error);
            } else {
                //this.log('CurrentBattery level Number(result): %s', Number(result));
                thisdevice.StatusLowBattery = parseInt(Number(result) * 100 / 5000, 10);
                this.log('CurrentBattery level: %s', thisdevice.StatusLowBattery);
                if (thisdevice.StatusLowBattery > 100)
                    thisdevice.StatusLowBattery = 100;
                else if (thisdevice.StatusLowBattery < 0)
                    thisdevice.StatusLowBattery = 0;
                callback(null, thisdevice.StatusLowBattery);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getLowBatteryStatus = function (thisdevice, callback) {

    this.log("getting low battery status for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.StatusLowBattery);
    } else {
        this.dogetLowBatteryStatus(thisdevice, function (error, state) {
            //thisdevice.StatusLowBattery = state;
            callback(error, thisdevice.StatusLowBattery);
        });
    }
}

DomotigaPlatform.prototype.dogetLowBatteryStatus = function (thisdevice, callback) {
        this.domotigaGetValue(thisdevice.device, thisdevice.valueBattery, function (error, result) {
            if (error) {
                this.log.error('BatteryStatus GetValue failed: %s', error.message);
                callback(error);
            } else {
                var value = Number(result);
                if (isNaN(value) || value < Number(thisdevice.lowbattery))
                    thisdevice.StatusLowBattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
                else
                    thisdevice.StatusLowBattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

                callback(null, thisdevice.StatusLowBattery);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.dogetMotionDetected = function (thisdevice, callback) {

    this.log("getting MotionDetected for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.MotionDetected);
    } else {
        this.dogetMotionDetected(thisdevice, function (error, state) {
            //thisdevice.MotionDetected = state;
            callback(error, thisdevice.MotionDetected);
        });
    }
}

DomotigaPlatform.prototype.getMotionDetected = function (thisdevice, callback) {

        this.domotigaGetValue(thisdevice.device, thisdevice.valueMotionSensor, function (error, result) {
            if (error) {
                this.log.error('getMotionDetected GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (Number(result) == 0)
                    thisdevice.MotionDetected = 1;
                else
                    thisdevice.MotionDetected = 0;

                callback(null, thisdevice.MotionDetected);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.getSwitchState = function (thisdevice, callback) {

    this.log("getting SwitchState for " + thisdevice.name);
    if (thisdevice.polling) {
        // Get state directly from cache if polling is enabled
        callback(null, thisdevice.switchState);
    } else {
        this.dogetSwitchState(thisdevice, function (error, state) {
            //thisdevice.switchState = state;
            callback(error, thisdevice.switchState);
        });
    }
}

DomotigaPlatform.prototype.dogetSwitchState = function (thisdevice, callback) {

        this.domotigaGetValue(thisdevice.device, thisdevice.valueSwitch, function (error, result) {
            if (error) {
                this.log.error('getSwitchState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    thisdevice.switchState = 1;
                else
                    thisdevice.switchState = 0;

                callback(null, thisdevice.switchState);
            }
        }.bind(this));
}

DomotigaPlatform.prototype.setSwitchState = function (thisdevice, switchOn, callback) {
    this.log("Setting SwitchState for '%s' to %s", thisdevice.name, switchOn);

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
            //this.log.error("Sorry err: ", err);
            callback(err);
        } else {
            item = Number(deviceValueNo) - 1;
            //this.log("data.result:", data.result);
            //this.log( "data.result.values[item].value", data.result.values[item].value);
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

