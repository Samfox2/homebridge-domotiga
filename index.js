//"use strict";
var Accessory, Service, Characteristic, UUIDGen;
var JSONRequest = require("jsonrequest");
var inherits = require('util').inherits;
var path = require('path');
var fs = require('fs');
var moment = require('moment');
//var FakeGatoHistoryService = require('./fakegato-history.js')(this.platform.homebridge);
//var FakeGatoHistoryService = require('./fakegato-history.js');
let localCache;
let localPath;
let _homebridge;
var FakeGatoHistoryService;

module.exports = function (homebridge) {
    console.log("homebridge API version: " + homebridge.version);

    // Paths
    localCache = path.join(homebridge.user.storagePath(), 'domotiga.json');
    localPath = homebridge.user.storagePath()
    _homebridge = homebridge;
	
    // Accessory must be created from PlatformAccessory Constructor    
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs    
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    

    ////////////////////////////// Custom characteristics //////////////////////////////
	FakeGatoHistoryService = require('./fakegato-history.js')(homebridge);
	
    Characteristic.EvePowerConsumption = function () {
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
    inherits(Characteristic.EvePowerConsumption, Characteristic);
    Characteristic.EvePowerConsumption.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';


    Characteristic.EveTotalPowerConsumption = function () {
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
    inherits(Characteristic.EveTotalPowerConsumption, Characteristic);
    Characteristic.EveTotalPowerConsumption.UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';


    Characteristic.EveRoomAirQuality = function () {
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
    inherits(Characteristic.EveRoomAirQuality, Characteristic);
    Characteristic.EveRoomAirQuality.UUID = 'E863F10B-079E-48FF-8F27-9C2605A29F52';


    Characteristic.EveBatteryLevel = function () {
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
    inherits(Characteristic.EveBatteryLevel, Characteristic);
    Characteristic.EveBatteryLevel.UUID = 'E863F11B-079E-48FF-8F27-9C2605A29F52';


    Characteristic.EveAirPressure = function () {
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
    inherits(Characteristic.EveAirPressure, Characteristic);
    Characteristic.EveAirPressure.UUID = 'E863F10F-079E-48FF-8F27-9C2605A29F52';



    ////////////////////////////// Custom services //////////////////////////////
    Service.PowerMeterService = function (displayName, subtype) {
        Service.call(this, displayName, '00000001-0000-1777-8000-775D67EC4377', subtype);
        // Required Characteristics
        this.addCharacteristic(Characteristic.EvePowerConsumption);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.EveTotalPowerConsumption);
    };
    inherits(Service.PowerMeterService, Service);
    Service.PowerMeterService.UUID = '00000001-0000-1777-8000-775D67EC4377';


    //Eve service (custom UUID)
    Service.EveRoomService = function (displayName, subtype) {
        Service.call(this, displayName, 'E863F002-079E-48FF-8F27-9C2605A29F52', subtype);
        // Required Characteristics
        this.addCharacteristic(Characteristic.EveRoomAirQuality);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
    };
    inherits(Service.EveRoomService, Service);
    Service.EveRoomService.UUID = 'E863F002-079E-48FF-8F27-9C2605A29F52';


    /////////////////////////////////////////////////////////////////////////////////////////////
    //Eve service (custom UUID)
    Service.EveWeatherService = function (displayName, subtype) {
        Service.call(this, displayName, 'E863F001-079E-48FF-8F27-9C2605A29F52', subtype);
        // Required Characteristics
        this.addCharacteristic(Characteristic.EveAirPressure);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
        this.addOptionalCharacteristic(Characteristic.CurrentTemperature);
        this.addOptionalCharacteristic(Characteristic.EveBatteryLevel);
    };
    inherits(Service.EveWeatherService, Service);
    Service.EveWeatherService.UUID = 'E863F001-079E-48FF-8F27-9C2605A29F52';


    // Consider platform plugin as dynamic platform plugin
    homebridge.registerPlatform("homebridge-domotiga", "DomotiGa", DomotigaPlatform, true);
}

function DomotigaPlatform(log, config, api) {
    this.log = log;
    this.config = config;
    this.homebridge = _homebridge;
    this.log("DomotiGa Plugin Version " + this.getVersion());
    this.log("Plugin by Samfox2 https://github.com/samfox2");
    this.log("DomotiGa is a Open Source Home Automation Software for Linux");
    this.log("Please report any issues to https://github.com/samfox2/homebridge-domotiga/issues");

    var self = this;
    self.fetch_npmVersion("homebridge-domotiga", function (npmVersion) {
        npmVersion = npmVersion.replace('\n', '');
        self.log("NPM %s vs Local %s", npmVersion, self.getVersion());
        if (npmVersion > self.getVersion()) {
            self.log.warn("There is a new Version available. Please update with sudo npm -g update homebridge-domotiga");
        }
    });

    if (config) {
        // Global configuration
        this.host = this.config.host || 'localhost';
        this.port = this.config.port || 9090;

        // Device specific configuration
        this.devices = this.config.devices || [];
        this.accessories = {};
        this.polling = {};

        if (api) {
            this.api = api;
            this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
        }
    }
}

// Method to restore accessories from cache
DomotigaPlatform.prototype.configureAccessory = function (accessory) {
    this.setService(accessory);
    this.accessories[accessory.context.name] = accessory;
}

// Method to setup accessories from config.json
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

    // Check number of devices
    var noD = this.accessories.length;
    this.log("Number of mapped devices : " + noD);
    if (noD > 100) {
        this.log.error("********************************************");
        this.log.error("* You are using more than 100 HomeKit      *");
        this.log.error("* devices behind a bridge. At this time    *");
        this.log.error("* HomeKit only supports up to 100 devices. *");
        this.log.error("* This may end up that iOS is not able to  *");
        this.log.error("* connect to the bridge anymore.           *");
        this.log.error("********************************************");
    } else {
        if (noD > 90) {
            this.log.warn("You are using more than 90 HomeKit");
            this.log.warn("devices behind a bridge. At this time");
            this.log.warn("HomeKit only supports up to 100 devices.");
            this.log.warn("This is just a warning. Everything should");
            this.log.warn("work fine until you are below that 100.");
        }
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
        accessory.context.name = data.name || "NA";
        accessory.context.service = data.service;
        accessory.context.device = data.device;
        accessory.context.manufacturer = data.manufacturer || "NA";
        accessory.context.model = data.model || "NA";
        accessory.context.valueTemperature = data.valueTemperature;
        accessory.context.valueHumidity = data.valueHumidity;
        accessory.context.valueAirPressure = data.valueAirPressure;
        accessory.context.valueBattery = data.valueBattery;
        accessory.context.lowbattery = data.lowbattery;
        accessory.context.valueContact = data.valueContact;
        accessory.context.valueSwitch = data.valueSwitch;
        accessory.context.valueDoor = data.valueDoor;
        accessory.context.valueWindow = data.valueWindow;
        accessory.context.valueWindowCovering = data.valueWindowCovering;
        accessory.context.valueAirQuality = data.valueAirQuality;
        accessory.context.valueOutlet = data.valueOutlet;
        accessory.context.valueLeakSensor = data.valueLeakSensor;
        accessory.context.valueMotionSensor = data.valueMotionSensor;
        accessory.context.valuePowerConsumption = data.valuePowerConsumption;
        accessory.context.valueTotalPowerConsumption = data.valueTotalPowerConsumption;
        accessory.context.valueLight = data.valueLight;
        accessory.context.brightness = data.brightness;
        accessory.context.color = data.color;
        // if color is enabled, we need all three properties
        if ( accessory.context.color ) {
            accessory.context.hue = true;
            accessory.context.staturation = true;
            accessory.context.brightness = true;
        }
        accessory.context.valueTargetTemperature = data.valueTargetTemperature;
        accessory.context.CurrentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.AUTO; //fixed as DomotiGa doesn't expose this property
        accessory.context.TargetHeatingCoolingState = data.Characteristic.TargetHeatingCoolingState.AUTO; //fixed as DomotiGa doesn't expose this property
        accessory.context.CurrentTemperature = data.CurrentTemperature;
        accessory.context.TargetTemperature = data.TargetTemperature;
        accessory.context.TemperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS; //fixed
		
        accessory.context.polling = data.polling;
        accessory.context.pollInMs = data.pollInMs || 1;
		
        var primaryservice;

        // Setup HomeKit service(-s)
        switch (accessory.context.service) {

            case "TemperatureSensor":
                primaryservice = new Service.TemperatureSensor(accessory.context.name);
                if (!accessory.context.valueTemperature) {
                    this.log.error('%s: missing definition of valueTemperature in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "HumiditySensor":
                primaryservice = new Service.HumiditySensor(accessory.context.name);
                if (!accessory.context.valueHumidity) {
                    this.log.error('%s: missing definition of valueHumidity in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Contact":
                primaryservice = new Service.ContactSensor(accessory.context.name);
                if (!accessory.context.valueContact) {
                    this.log.error('%s: missing definition of valueContact in config.json!', accessory.context.name);
                    return;
                }

            case "LeakSensor":
                primaryservice = new Service.LeakSensor(accessory.context.name);
                if (!accessory.context.valueLeakSensor) {
                    this.log.error('%s: missing definition of valueLeakSensor in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "MotionSensor":
                primaryservice = new Service.MotionSensor(accessory.context.name);
                if (!accessory.context.valueMotionSensor) {
                    this.log.error('%s: missing definition of valueMotionSensor in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Switch":
                primaryservice = new Service.Switch(accessory.context.name);
                if (!accessory.context.valueSwitch) {
                    this.log.error('%s: missing definition of valueSwitch in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Door":
                primaryservice = new Service.Door(accessory.context.name);
                if (!accessory.context.valueDoor) {
                    this.log.error('%s: missing definition of valueDoor in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Window":
                primaryservice = new Service.Window(accessory.context.name);
                if (!accessory.context.valueWindow) {
                    this.log.error('%s: missing definition of valueWindow in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "WindowCovering":
                primaryservice = new Service.WindowCovering(accessory.context.name);
                if (!accessory.context.valueWindowCovering) {
                    this.log.error('%s: missing definition of valueWindowCovering in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Outlet":
                primaryservice = new Service.Outlet(accessory.context.name);
                if (!accessory.context.valueOutlet) {
                    this.log.error('%s: missing definition of valueOutlet in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "AirQualitySensor":
                primaryservice = new Service.AirQualitySensor(accessory.context.name);
                if (!accessory.context.valueAirQuality) {
                    this.log.error('%s: missing definition of valueAirQuality in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "FakeEveAirQualitySensor":
                primaryservice = new Service.EveRoomService("Eve Room");
                if (!accessory.context.valueAirQuality) {
                    this.log.error('%s: missing definition of valueAirQuality in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "FakeEveWeatherSensor":
                primaryservice = new Service.EveWeatherService("Eve Weather");
                if (!accessory.context.valueAirPressure) {
                    this.log.error('%s: missing definition of valueAirPressure in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Powermeter":
                primaryservice = new Service.PowerMeterService(accessory.context.name);
                if (!accessory.context.valuePowerConsumption) {
                    this.log.error('%s: missing definition of valuePowerConsumption in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Lightbulb":
                primaryservice = new Service.Lightbulb(accessory.context.name);
                if (!accessory.context.valueLight) {
                    this.log.warn('%s: missing definition of valueLight in config.json!', accessory.context.name);
                    return;
                }
                break;

            case "Thermostat":
                primaryservice = new Service.Thermostat(accessory.context.name);
                if (!accessory.context.valueTemperature) {
                    this.log.error('%s: missing definition of valueTemperature in config.json!', accessory.context.name);
                    return;
                }
                if (!accessory.context.valueTargetTemperature) {
                    this.log.warn('%s: missing definition of valueThermostat in config.json!', accessory.context.name);
                    return;
                }
                break;

            default:
                this.log.error('Service %s %s unknown for add, skipping...', accessory.context.service, accessory.context.name);
                return;
                break;
        }

        // Everything outside the primary service gets added as additional characteristics...
        if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor") && (accessory.context.service != "Thermostat")) {
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
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor")) {
            primaryservice.addCharacteristic(Characteristic.EveAirPressure);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirQuality &&
            (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
            primaryservice.addCharacteristic(Characteristic.AirQuality);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
            primaryservice.addCharacteristic(Characteristic.EvePowerConsumption);
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            primaryservice.addCharacteristic(Characteristic.EveTotalPowerConsumption);
        }

        // Setup HomeKit switch service
        accessory.addService(primaryservice, data.name);
	    
         // Add history logging service    
        if (accessory.context.polling && accessory.context.valueTemperature && (accessory.context.service === "TemperatureSensor") ) {
            this.log.debug("Adding Log Service for %s",accessory.context.name);
            this.loggingService = new FakeGatoHistoryService("thermo", this, {storage: 'fs', path: this.localCache,disableTimer:true});
            accessory.addService(this.loggingService, data.name);
        }
	    
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
    accessory.context.cachePowerConsumption = 0;
    accessory.context.cacheTotalPowerConsumption = 0;
    accessory.context.cacheCurrentBatteryLevel = 0;
    accessory.context.cacheStatusLowBattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    accessory.context.cacheMotionSensorState = 0;
    accessory.context.cacheSwitchState = 0;
    accessory.context.cacheDoorPosition = 0;
    accessory.context.cacheWindowPosition = 0;
    accessory.context.cacheWindowCoveringPosition = 0;
    accessory.context.cacheLightState = 0;
    accessory.context.cacheLightSaturation = 0;
    accessory.context.cacheLightHue = 0;
    accessory.context.cacheLightBrightness = 0;
    accessory.context.cacheTargetTemperature = 0;
    accessory.context.cacheTargetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
    accessory.context.cacheCurrentHeatingCoolingStatee = Characteristic.CurrentHeatingCoolingState.AUTO;

    // Retrieve initial state
    this.getInitState(accessory);

    // Configure state polling
    if (data.polling) this.doPolling(data.name);

}

// Function to remove accessory dynamically from outside event
DomotigaPlatform.prototype.removeAccessory = function (accessory) {
    if (accessory) {
        var name = accessory.context.name;
        this.log.warn("Removing accessory: " + name + ". No longer reachable or configured.");
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

    // Get primary service
    var primaryservice;

    switch (thisDevice.service) {

        case "TemperatureSensor":
            primaryservice = accessory.getService(Service.TemperatureSensor);
            this.readCurrentTemperature(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentTemperature) {
                    thisDevice.cacheCurrentTemperature = value;
                    primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
                    accessory.getService(FakeGatoHistoryService).addEntry({time: moment().unix(), currentTemp:parseFloat(value)});
                }
            });
            break;

        case "HumiditySensor":
            primaryservice = accessory.getService(Service.HumiditySensor);
            this.readCurrentRelativeHumidity(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentRelativeHumidity) {
                    thisDevice.cacheCurrentRelativeHumidity = value;
                    primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
                }
            });
            break;

        case "Contact":
            primaryservice = accessory.getService(Service.ContactSensor);
            this.readContactState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheContactSensorState) {
                    thisDevice.cacheContactSensorState = value;
                    primaryservice.getCharacteristic(Characteristic.cacheContactSensorState).getValue();
                }
            });
            break;

        case "LeakSensor":
            primaryservice = accessory.getService(Service.LeakSensor);
            this.readLeakSensorState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheLeakSensorState) {
                    thisDevice.cacheLeakSensorState = value;
                    primaryservice.getCharacteristic(Characteristic.LeakDetected).getValue();
                }
            });
            break;

        case "MotionSensor":
            primaryservice = accessory.getService(Service.MotionSensor);
            this.readMotionSensorState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheMotionSensorState) {
                    thisDevice.cacheMotionSensorState = value;
                    primaryservice.getCharacteristic(Characteristic.MotionDetected).getValue();
                }
            });
            break;

        case "Switch":
            primaryservice = accessory.getService(Service.Switch);
            this.readSwitchState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheSwitchState) {
                    thisDevice.cacheSwitchState = value;
                    primaryservice.getCharacteristic(Characteristic.On).getValue();
                }
            });
            break;

        case "Door":
            primaryservice = accessory.getService(Service.Door);
            this.readDoorPosition(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheDoorPosition) {
                    thisDevice.cacheDoorPosition = value;
                    primaryservice.getCharacteristic(Characteristic.CurrentPosition).getValue();
                }
            });
            primaryservice.getCharacteristic(Characteristic.PositionState).getValue();
            break;

        case "Window":
            primaryservice = accessory.getService(Service.Window);
            this.readWindowPosition(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheWindowPosition) {
                    thisDevice.cacheWindowPosition = value;
                    primaryservice.getCharacteristic(Characteristic.CurrentPosition).getValue();
                }
            });
            primaryservice.getCharacteristic(Characteristic.PositionState).getValue();
            break;

        case "WindowCovering":
            primaryservice = accessory.getService(Service.WindowCovering);
            this.readWindowCoveringPosition(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheWindowCoveringPosition) {
                    thisDevice.cacheWindowCoveringPosition = value;
                    primaryservice.getCharacteristic(Characteristic.CurrentPosition).getValue();
                }
            });
            primaryservice.getCharacteristic(Characteristic.PositionState).getValue();
            break;

        case "Outlet":
            primaryservice = accessory.getService(Service.Outlet);
            this.readOutletState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheOutletState) {
                    thisDevice.cacheOutletState = value;
                    primaryservice.getCharacteristic(Characteristic.On).getValue();
                }
            });
            this.readOutletInUse(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheOutletInUse) {
                    thisDevice.cacheOutletInUse = value;
                    primaryservice.getCharacteristic(Characteristic.OutletInUse).getValue();
                }
            });
            break;

        case "AirQualitySensor":
            primaryservice = accessory.getService(Service.AirQualitySensor);
            this.readCurrentAirQuality(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentAirQuality) {
                    thisDevice.cacheCurrentAirQuality = value;
                    primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
                }
            });
            break;

        case "FakeEveAirQualitySensor":
            primaryservice = accessory.getService(Service.EveRoomService);
            this.readCurrentEveAirQuality(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentAirQuality) {
                    thisDevice.cacheCurrentAirQuality = value;
                    primaryservice.getCharacteristic(Characteristic.EveRoomAirQuality).getValue();
                }
            });
            break;

        case "FakeEveWeatherSensor":
            primaryservice = accessory.getService(Service.EveWeatherService);
            this.readCurrentAirPressure(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheCurrentAirPressure) {
                    thisDevice.cacheCurrentAirPressure = value;
                    primaryservice.getCharacteristic(Characteristic.EveAirPressure).getValue();
                }
            });
            break;

        case "Powermeter":
            primaryservice = accessory.getService(Service.PowerMeterService);
            this.readEvePowerConsumption(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cachePowerConsumption) {
                    thisDevice.cachePowerConsumption = value;
                    primaryservice.getCharacteristic(Characteristic.EvePowerConsumption).getValue();
                }
            });
            break;

        case "Lightbulb":
            primaryservice = accessory.getService(Service.Lightbulb);
            this.readLightState(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheLightState) {
                    thisDevice.cacheLightState = value;
                    primaryservice.getCharacteristic(Characteristic.On).getValue();
                }
            });
            if ( accessory.context.brightness || accessory.context.color  ) {
                this.readLightBrightnessState(thisDevice, function (error, value) {
                    // Update value if there's no error
                    if (!error && value !== thisDevice.cacheLightBrightness) {
                        thisDevice.cacheLightBrightness = value;
                        primaryservice.getCharacteristic(Characteristic.Brightness).getValue();
                    }
                });
            }
            if ( accessory.context.color  ) {
                this.readHueState(thisDevice, function (error, value) {
                    // Update value if there's no error
                    if (!error && value !== thisDevice.cacheLightHue) {
                        thisDevice.cacheLightHue = value;
                        primaryservice.getCharacteristic(Characteristic.Hue).getValue();
                    }
                });
                this.readSaturationState(thisDevice, function (error, value) {
                    // Update value if there's no error
                    if (!error && value !== thisDevice.cacheLightSaturation) {
                        thisDevice.cacheLightSaturation = value;
                        primaryservice.getCharacteristic(Characteristic.Saturation).getValue();
                    }
                });
            }
            break;

        case "Thermostat":
            primaryservice = accessory.getService(Service.Thermostat);
            this.readTargetTemperature(thisDevice, function (error, value) {
                // Update value if there's no error
                if (!error && value !== thisDevice.cacheTargetTemperature) {
                    thisDevice.cacheTargetTemperature = value;
                    primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
                }
            });

        default:
            this.log.error('Service %s %s unknown for polling, skipping...', accessory.context.service, accessory.context.name);
            break;
    }

    // Additional/optional characteristics...
    if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
        this.readCurrentTemperature(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentTemperature) {
                thisDevice.cacheCurrentTemperature = value;
                primaryservice.getCharacteristic(Characteristic.CurrentTemperature).getValue();
            }
        });
    }
    if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
        this.readCurrentRelativeHumidity(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentRelativeHumidity) {
                thisDevice.cacheCurrentRelativeHumidity = value;
                primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue();
            }
        });
    }
    if (accessory.context.valueBattery) {
        this.readCurrentBatteryLevel(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentBatteryLevel) {
                thisDevice.cacheCurrentBatteryLevel = value;
                primaryservice.getCharacteristic(Characteristic.BatteryLevel).getValue();
            }
        });
    }
    if (accessory.context.lowbattery) {
        this.readLowBatteryStatus(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheStatusLowBattery) {
                thisDevice.cacheStatusLowBattery = value;
                primaryservice.getCharacteristic(Characteristic.StatusLowBattery).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirPressure &&
        (accessory.context.service != "FakeEveWeatherSensor")) {
        this.readCurrentAirPressure(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentAirPressure) {
                thisDevice.cacheCurrentAirPressure = value;
                primaryservice.getCharacteristic(Characteristic.EveAirPressure).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirQuality &&
        (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
        this.readCurrentEveAirQuality(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheCurrentAirQuality) {
                thisDevice.cacheCurrentAirQuality = value;
                primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
        this.readEvePowerConsumption(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cachePowerConsumption) {
                thisDevice.cachePowerConsumption = value;
                primaryservice.getCharacteristic(Characteristic.EvePowerConsumption).getValue();
            }
        });
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueTotalPowerConsumption) {
        this.readEveTotalPowerConsumption(thisDevice, function (error, value) {
            // Update value if there's no error
            if (!error && value !== thisDevice.cacheTotalPowerConsumption) {
                thisDevice.cacheTotalPowerConsumption = value;
                primaryservice.getCharacteristic(Characteristic.EveTotalPowerConsumption).getValue();
            }
        });
    }

    // Setup for next polling
    this.polling[name] = setTimeout(this.doPolling.bind(this, name), thisDevice.pollInMs * 1000);

}

// Method to setup listeners for different events
DomotigaPlatform.prototype.setService = function (accessory) {

    var primaryservice;

    // Setup HomeKit service(-s)
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

        case "LeakSensor":
            primaryservice = accessory.getService(Service.LeakSensor);
            primaryservice.getCharacteristic(Characteristic.LeakDetected)
                .on('get', this.getLeakSensorState.bind(this, accessory.context));
            break;

        case "MotionSensor":
            primaryservice = accessory.getService(Service.MotionSensor);
            primaryservice.getCharacteristic(Characteristic.MotionDetected)
                .on('get', this.getMotionSensorState.bind(this, accessory.context));
            break;

        case "Switch":
            primaryservice = accessory.getService(Service.Switch);
            primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getSwitchState.bind(this, accessory.context))
                .on('set', this.setSwitchState.bind(this, accessory.context))
            break;

        case "Door":
            primaryservice = accessory.getService(Service.Door);
            primaryservice.getCharacteristic(Characteristic.CurrentPosition)
                .on('get', this.getDoorPosition.bind(this, accessory.context))
            primaryservice.getCharacteristic(Characteristic.TargetPosition)
                .on('get', this.getDoorPosition.bind(this, accessory.context))
                .on('set', this.setDoorPosition.bind(this, accessory.context))
            primaryservice.getCharacteristic(Characteristic.PositionState)
                .on('get', this.getDoorPositionState.bind(this, accessory.context))
            break;

        case "Window":
            primaryservice = accessory.getService(Service.Window);
            primaryservice.getCharacteristic(Characteristic.CurrentPosition)
                .on('get', this.getWindowPosition.bind(this, accessory))
            primaryservice.getCharacteristic(Characteristic.TargetPosition)
                .on('get', this.getWindowPosition.bind(this, accessory))
                .on('set', this.setWindowPosition.bind(this, accessory))
            primaryservice.getCharacteristic(Characteristic.PositionState)
                .on('get', this.getWindowPositionState.bind(this, accessory))
            break;

        case "WindowCovering":
            primaryservice = accessory.getService(Service.WindowCovering);
            primaryservice.getCharacteristic(Characteristic.CurrentPosition)
                .on('get', this.getWindowCoveringPosition.bind(this, accessory.context))
            primaryservice.getCharacteristic(Characteristic.TargetPosition)
                .on('get', this.getWindowCoveringPosition.bind(this, accessory.context))
                .on('set', this.setWindowCoveringPosition.bind(this, accessory.context))
            primaryservice.getCharacteristic(Characteristic.PositionState)
                .on('get', this.getWindowCoveringPositionState.bind(this, accessory.context))
            break;

        case "Outlet":
            primaryservice = accessory.getService(Service.Outlet);
            primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getOutletState.bind(this, accessory.context))
                .on('set', this.setOutletState.bind(this, accessory.context));
            primaryservice.getCharacteristic(Characteristic.OutletInUse)
                    .on('get', this.getOutletInUse.bind(this, accessory.context));
            break;

        case "AirQualitySensor":
            primaryservice = accessory.getService(Service.AirQualitySensor);
            primaryservice.getCharacteristic(Characteristic.AirQuality)
                .on('get', this.getCurrentAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveAirQualitySensor":
            primaryservice = accessory.getService(Service.EveRoomService);
            primaryservice.getCharacteristic(Characteristic.EveRoomAirQuality)
                .on('get', this.getCurrentEveAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveWeatherSensor":
            primaryservice = accessory.getService(Service.EveWeatherService);
            primaryservice.getCharacteristic(Characteristic.EveAirPressure)
                .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
            break;

        case "Powermeter":
            primaryservice = accessory.getService(Service.PowerMeterService);
            primaryservice.getCharacteristic(Characteristic.EvePowerConsumption)
                .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
            break;

        case "Lightbulb":
            primaryservice = accessory.getService(Service.Lightbulb);
            primaryservice.getCharacteristic(Characteristic.On)
				.on('get', this.getLightState.bind(this, accessory.context))
				.on('set', this.setLightState.bind(this, accessory.context));
            if ( accessory.context.color) {
                primaryservice.getCharacteristic(Characteristic.Hue)
					.on('get', this.getLightHue.bind(this, accessory.context))
					.on('set', this.setLightHue.bind(this, accessory.context));
                primaryservice.getCharacteristic(Characteristic.Saturation)
					.on('get', this.getLightSaturation.bind(this, accessory.context))
					.on('set', this.setLightSaturation.bind(this, accessory.context));
            }
            if ( accessory.context.brightness || accessory.context.color ) {
                primaryservice.getCharacteristic(Characteristic.Brightness)
					.on('get', this.getLightBrightnessState.bind(this, accessory.context))
					.on('set', this.setLightBrightnessState.bind(this, accessory.context));
            }
            break;

        case "Thermostat":
            primaryservice = accessory.getService(Service.Thermostat);
            primaryservice.getCharacteristic(Characteristic.TargetTemperature)
                .on('get', this.getTargetTemperature.bind(this, accessory.context))
                .on('set', this.setTargetTemperature.bind(this, accessory.context))
            primaryservice.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                .on('get', this.getCurrentHeatingCoolingState.bind(this, accessory.context))
            primaryservice.getCharacteristic(Characteristic.TargetHeatingCoolingState)
                .on('get', this.getTargetHeatingCoolingState.bind(this, accessory.context))
                .on('set', this.setTargetHeatingCoolingState.bind(this, accessory.context))
            primaryservice.getCharacteristic(Characteristic.TemperatureDisplayUnits)
				.on('get', this.getTemperatureDisplayUnits.bind(this, accessory.context))
				.on('set', this.setTemperatureDisplayUnits.bind(this, accessory.context));			
            break;

        default:
            this.log.error('Service %s %s unknown for set, skipping...', accessory.context.service, accessory.context.name);
            break;
    }

    // Everything outside the primary service gets added as additional characteristics...
    if (primaryservice) {
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
        // Eve characteristic (custom UUID)
        if (accessory.context.valueAirPressure &&
            (accessory.context.service != "FakeEveWeatherSensor")) {
            primaryservice.getCharacteristic(Characteristic.EveAirPressure)
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
            primaryservice.getCharacteristic(Characteristic.EvePowerConsumption)
                .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
        }
        // Eve characteristic (custom UUID)
        if (accessory.context.valueTotalPowerConsumption) {
            primaryservice.getCharacteristic(Characteristic.EveTotalPowerConsumption)
                .on('get', this.getEveTotalPowerConsumption.bind(this, accessory.context));
        }
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

        // Get primary service
        var primaryservice;

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

            case "Door":
                primaryservice = accessory.getService(Service.Door);
                primaryservice.getCharacteristic(Characteristic.CurrentPosition).getValue();
                primaryservice.getCharacteristic(Characteristic.PositionState).getValue();
                break;

            case "Window":
                primaryservice = accessory.getService(Service.Window);
                primaryservice.getCharacteristic(Characteristic.CurrentPosition).getValue();
                primaryservice.getCharacteristic(Characteristic.PositionState).getValue();
                break;

            case "WindowCovering":
                primaryservice = accessory.getService(Service.WindowCovering);
                primaryservice.getCharacteristic(Characteristic.CurrentPosition).getValue();
                primaryservice.getCharacteristic(Characteristic.PositionState).getValue();
                break;

            case "Outlet":
                primaryservice = accessory.getService(Service.Outlet);
                primaryservice.getCharacteristic(Characteristic.On).getValue();
                primaryservice.getCharacteristic(Characteristic.OutletInUse).getValue();
                break;

            case "AirQualitySensor":
                primaryservice = accessory.getService(Service.AirQualitySensor);
                primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
                break;

            case "FakeEveAirQualitySensor":
                primaryservice = accessory.getService(Service.EveRoomService);
                primaryservice.getCharacteristic(Characteristic.EveRoomAirQuality).getValue();
                break;

            case "FakeEveWeatherSensor":
                primaryservice = accessory.getService(Service.EveWeatherService);
                primaryservice.getCharacteristic(Characteristic.EveAirPressure).getValue();
                break;

            case "Powermeter":
                primaryservice = accessory.getService(Service.PowerMeterService);
                primaryservice.getCharacteristic(Characteristic.EvePowerConsumption).getValue();
                break;
				
            case "Lightbulb":
                primaryservice = accessory.getService(Service.Lightbulb);
                if ( accessory.context.color ) {
                    primaryservice.getCharacteristic(Characteristic.Hue).getValue();
                    primaryservice.getCharacteristic(Characteristic.Saturation).getValue();
                }
                if ( accessory.context.color || accessory.context.brightness ) {
                    primaryservice.getCharacteristic(Characteristic.Brightness).getValue();
                }
                break;
				
            case "Thermostat":
                primaryservice = accessory.getService(Service.Thermostat);
                primaryservice.getCharacteristic(Characteristic.TargetTemperature).getValue();
                primaryservice.getCharacteristic(Characteristic.CurrentHeatingCoolingState).getValue();
                primaryservice.getCharacteristic(Characteristic.TargetHeatingCoolingState).getValue();
                break;

            default:
                this.log.error('Service %s %s unknown for initstate, skipping...', accessory.context.service, accessory.context.name);
                break;
        }

        // Additional/optional characteristics...
        if (primaryservice) {
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
            // Eve characteristic (custom UUID)
            if (accessory.context.valueAirPressure &&
                (accessory.context.service != "FakeEveWeatherSensor")) {
                primaryservice.getCharacteristic(Characteristic.EveAirPressure).getValue();
            }
            // Eve characteristic (custom UUID)
            if (accessory.context.valueAirQuality &&
                (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
                primaryservice.getCharacteristic(Characteristic.AirQuality).getValue();
            }
            // Eve characteristic (custom UUID)
            if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
                primaryservice.getCharacteristic(Characteristic.EvePowerConsumption).getValue();
            }
            // Eve characteristic (custom UUID)
            if (accessory.context.valueTotalPowerConsumption) {
                primaryservice.getCharacteristic(Characteristic.EveTotalPowerConsumption).getValue();
            }
        }
    }

    // Configured accessory is reachable
    accessory.updateReachability(true);
}

DomotigaPlatform.prototype.readCurrentTemperature = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting temperature...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueTemperature, function (error, result) {
        if (error) {
            self.log.error('%s: readCurrentTemperature failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            self.log('%s: temperature: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

// Method to determine current temperature
DomotigaPlatform.prototype.getCurrentTemperature = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached temperature is: %s', thisDevice.name, thisDevice.cacheCurrentTemperature);
        callback(null, thisDevice.cacheCurrentTemperature);
    } else {
        // Check value if polling is disabled
        this.readCurrentTemperature(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentTemperature = value;
            callback(error, thisDevice.cacheCurrentTemperature);
        });
    }
}

DomotigaPlatform.prototype.readCurrentRelativeHumidity = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting relative humidity...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueHumidity, function (error, result) {
        if (error) {
            self.log.error('%s: readCurrentRelativeHumidity failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            self.log('%s: relative humidity: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

// Method to determine current relative humidity
DomotigaPlatform.prototype.getCurrentRelativeHumidity = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached relative humidity is: %s', thisDevice.name, thisDevice.cacheCurrentRelativeHumidity);
        callback(null, thisDevice.cacheCurrentRelativeHumidity);
    } else {
        // Check value if polling is disabled
        this.readCurrentRelativeHumidity(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentRelativeHumidity = value;
            callback(error, thisDevice.cacheCurrentRelativeHumidity);
        });
    }
}

DomotigaPlatform.prototype.getTemperatureUnits = function (thisDevice, callback) {
    this.log("%s: getting temperature unit...", thisDevice.name);
    // 1 = F and 0 = C
    callback(null, 0);
}


DomotigaPlatform.prototype.setTemperatureUnits = function (thisDevice, value, callback) {
    this.log("%s: ignore setting temperature unit to %s", thisDevice.name, value);
    // 1 = F and 0 = C
    callback(null, 0);
}

DomotigaPlatform.prototype.readCurrentAirPressure = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting air pressure...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueAirPressure, function (error, result) {
        if (error) {
            self.log.error('%s: readCurrentAirPressure failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            self.log('%s: air pressure: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getCurrentAirPressure = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached air pressure is: %s', thisDevice.name, thisDevice.cacheCurrentAirPressure);
        callback(null, thisDevice.cacheCurrentAirPressure);
    } else {
        // Check value if polling is disabled
        this.readCurrentAirPressure(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentAirPressure = value;
            callback(error, thisDevice.cacheCurrentAirPressure);
        });
    }
}

DomotigaPlatform.prototype.readContactState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting contact state...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueContact, function (error, result) {
        if (error) {
            self.log.error('%s: readContactState failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (result.toLowerCase() == "on") ? Characteristic.ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED;

            self.log('%s: contact state: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getContactState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached contact state is: %s', thisDevice.name, thisDevice.cacheContactSensorState);
        callback(null, thisDevice.cacheContactSensorState);
    } else {
        // Check value if polling is disabled
        this.readContactState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheContactSensorState = value;
            callback(error, thisDevice.cacheContactSensorState);
        });
    }
}

DomotigaPlatform.prototype.readLeakSensorState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting leaksensor state...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueLeakSensor, function (error, result) {
        if (error) {
            self.log.error('%s: readLeakSensorState failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (Number(result) == 0) ? Characteristic.LeakDetected.LEAK_NOT_DETECTED : Characteristic.LeakDetected.LEAK_DETECTED;

            self.log('%s: leaksensor state: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getLeakSensorState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached leaksensor state is: %s', thisDevice.name, thisDevice.cacheLeakSensorState);
        callback(null, thisDevice.cacheLeakSensorState);
    } else {
        // Check value if polling is disabled
        this.readLeakSensorState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheLeakSensorState = value;
            callback(error, thisDevice.cacheLeakSensorState);
        });
    }
}

DomotigaPlatform.prototype.readOutletState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting outlet state...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: readOutletState failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (result.toLowerCase() == "on") ? 0 : 1;

            self.log('%s: outlet state: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getOutletState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached outlet state is: %s', thisDevice.name, thisDevice.cacheOutletState);
        callback(null, thisDevice.cacheOutletState);
    } else {
        // Check value if polling is disabled
        this.readOutletState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheOutletState = value;
            callback(error, thisDevice.cacheOutletState);
        });
    }
}

DomotigaPlatform.prototype.setOutletState = function (thisDevice, boolvalue, callback) {
    var self = this;
    self.log("%s: Setting outlet state to %s", thisDevice.name, boolvalue);

    thisDevice.cacheOutletState = boolvalue;

    var OnOff = (boolvalue == 1) ? "On" : "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueOutlet, OnOff, function (err) {
        if (callbackWasCalled)
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");

        callbackWasCalled = true;
        if (!err) {
            self.log("%s: successfully set outlet state to %s", thisDevice.name, OnOff);
            callback(null);
        } else {
            self.log.error("%s: error setting outlet state to %s", thisDevice.name, OnOff);
            callback(err);
        }
    });
}

DomotigaPlatform.prototype.readOutletInUse = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting outletInUse...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: readOutletInUse failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (result.toLowerCase() == "on") ? false : true;

            self.log('%s: OutletInUse: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getOutletInUse = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached OutletInUse is: %s', thisDevice.name, thisDevice.cacheOutletInUse);
        callback(null, thisDevice.cacheOutletInUse);
    } else {
        // Check value if polling is disabled
        this.readOutletInUse(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheOutletInUse = value;
            callback(error, thisDevice.cacheOutletInUse);
        });
    }
}

DomotigaPlatform.prototype.readCurrentAirQuality = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting air quality...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueAirQuality, function (error, result) {
        if (error) {
            self.log.error('%s: readCurrentAirQuality failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            voc = Number(result);
            self.log('%s: current air quality level: %s', thisDevice.name, voc);

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

            self.log('%s: current air quality: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getCurrentAirQuality = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached air quality is: %s', thisDevice.name, thisDevice.cacheCurrentAirQuality);
        callback(null, thisDevice.cacheCurrentAirQuality);
    } else {
        // Check value if polling is disabled
        this.readCurrentAirQuality(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentAirQuality = value;
            callback(error, thisDevice.cacheCurrentAirQuality);
        });
    }
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.readCurrentEveAirQuality = function (thisDevice, callback) {
    // Custom Eve intervals:
    //    0... 700 : Exzellent
    //  700...1100 : Good
    // 1100...1600 : Acceptable
    // 1600...2000 : Moderate
    //      > 2000 : Bad	
    var self = this;
    self.log("%s: getting Eve air quality...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueAirQuality, function (error, result) {
        if (error) {
            self.log.error('%s: readCurrentEveAirQuality failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            if (value < 0)
                value = 0;

            self.log('%s: Eve air quality: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getCurrentEveAirQuality = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached Eve air quality is: %s', thisDevice.name, thisDevice.cacheCurrentAirQuality);
        callback(null, thisDevice.cacheCurrentAirQuality);
    } else {
        // Check value if polling is disabled
        this.readCurrentEveAirQuality(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentAirQuality = value;
            callback(error, thisDevice.cacheCurrentAirQuality);
        });
    }
}

// Eve characteristic (custom UUID) 
DomotigaPlatform.prototype.readEvePowerConsumption = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting Eve power consumption...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: readEvePowerConsumption failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Math.round(Number(result)); // W

            self.log('%s: Eve power consumption: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getEvePowerConsumption = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached Eve power consumption is: %s', thisDevice.name, thisDevice.cachePowerConsumption);
        callback(null, thisDevice.cachePowerConsumption);
    } else {
        // Check value if polling is disabled
        this.readEvePowerConsumption(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cachePowerConsumption = value;
            callback(error, thisDevice.cachePowerConsumption);
        });
    }
}

// Eve characteristic (custom UUID) 
DomotigaPlatform.prototype.readEveTotalPowerConsumption = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting Eve total power consumption...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueOutlet, function (error, result) {
        if (error) {
            self.log.error('%s: readEveTotalPowerConsumption failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Math.round(Number(result) * 1000.0) / 1000.0; // kWh

            self.log('%s: Eve total power consumption: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getEveTotalPowerConsumption = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached Eve total power consumption is: %s', thisDevice.name, thisDevice.cacheTotalPowerConsumption);
        callback(null, thisDevice.cacheTotalPowerConsumption);
    } else {
        // Check value if polling is disabled
        this.readEveTotalPowerConsumption(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheTotalPowerConsumption = value;
            callback(error, thisDevice.cacheTotalPowerConsumption);
        });
    }
}

DomotigaPlatform.prototype.readCurrentBatteryLevel = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting battery level...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueBattery, function (error, result) {
        if (error) {
            self.log.error('%s: readCurrentBatteryLevel failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            thisDevice.lastBatteryLevel = (Number(result));
            //this.log('CurrentBattery level Number(result): %s', Number(result));
            var value = parseInt(thisDevice.lastBatteryLevel * 100 / 5000, 10);
            if (value > 100)
                value = 100;
            else if (value < 0)
                value = 0;

            self.log('%s: current battery level: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getCurrentBatteryLevel = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached battery level is: %s', thisDevice.name, thisDevice.cacheCurrentBatteryLevel);
        callback(null, thisDevice.cacheCurrentBatteryLevel);
    } else {
        // Check value if polling is disabled
        this.readCurrentBatteryLevel(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheCurrentBatteryLevel = value;
            callback(error, thisDevice.cacheCurrentBatteryLevel);
        });
    }
}

DomotigaPlatform.prototype.readLowBatteryStatus = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting battery status...", thisDevice.name);

    var value = (thisDevice.lastBatteryLevel < Number(thisDevice.lowbattery)) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    self.log('%s: battery status: %s', thisDevice.name, value);
    callback(null, value);
}

DomotigaPlatform.prototype.getLowBatteryStatus = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached battery status is: %s', thisDevice.name, thisDevice.cacheStatusLowBattery);
        callback(null, thisDevice.cacheStatusLowBattery);
    } else {
        // Check value if polling is disabled
        this.readLowBatteryStatus(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheStatusLowBattery = value;
            callback(error, thisDevice.cacheStatusLowBattery);
        });
    }
}

DomotigaPlatform.prototype.readMotionSensorState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting motion sensor state...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueMotionSensor, function (error, result) {
        if (error) {
            self.log.error('%s: readMotionSensorState failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = (Number(result) == 0) ? 1 : 0;

            self.log('%s: motion sensor state: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getMotionSensorState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached motion sensor state is: %s', thisDevice.name, thisDevice.cacheMotionSensorState);
        callback(null, thisDevice.cacheMotionSensorState);
    } else {
        // Check value if polling is disabled
        this.readMotionSensorState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheMotionSensorState = value;
            callback(error, thisDevice.cacheMotionSensorState);
        });
    }
}

DomotigaPlatform.prototype.readSwitchState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting switch state...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueSwitch, function (error, result) {
        if (error) {
            self.log.error('%s: readSwitchState failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            self.log('%s: switch state: %s', thisDevice.name, result);
            callback(null, result);
        }
    });
}

DomotigaPlatform.prototype.getSwitchState = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached switch state is: %s', thisDevice.name, thisDevice.cacheSwitchState);
        callback(null, thisDevice.cacheSwitchState);
    } else {
        // Check value if polling is disabled
        this.readSwitchState(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheSwitchState = value;
            callback(error, thisDevice.cacheSwitchState);
        });
    }
}

DomotigaPlatform.prototype.setSwitchState = function (thisDevice, switchOn, callback) {
    var self = this;
    self.log("%s: setting switch state to %s", thisDevice.name, switchOn);
    var switchCommand;

    if (switchOn == 1) {
        switchCommand = "On";
    }
    else {
        switchCommand = "Off";
    }

    // Update cache
    thisDevice.cacheSwitchState = switchOn;

    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueSwitch, switchCommand, function (err) {
        if (callbackWasCalled) {
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            self.log("%s: successfully set switch state to %s", thisDevice.name, switchCommand);
            callback(null);
        } else {
            self.log.error("%s: error setting switch state to %s", thisDevice.name, switchCommand);
            callback(err);
        }
    });
}

DomotigaPlatform.prototype.getDoorPositionState = function (thisDevice, callback) {
    // At this time the value property of PositionState is always mapped to stopped
    callback(null, Characteristic.PositionState.STOPPED);
}

DomotigaPlatform.prototype.readDoorPosition = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting door position...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueDoor, function (error, result) {
        if (error) {
            self.log.error('%s: readDoorPosition failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {

            var value = (result == "0") ? 0 : 100;
            self.log('%s: door position: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getDoorPosition = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached door position is: %s', thisDevice.name, thisDevice.cacheDoorPosition);
        callback(null, thisDevice.cacheDoorPosition);
    } else {
        // Check value if polling is disabled
        this.readDoorPosition(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheDoorPosition = value;
            callback(error, thisDevice.cacheDoorPosition);
        });
    }
}

DomotigaPlatform.prototype.setDoorPosition = function (thisDevice, targetPosition, callback) {
    var self = this;
    self.log("%s: setting door position to %s", thisDevice.name, targetPosition);

    // At this time we do not use percentage values: 1 = open, 0 = closed
    var doorPosition;

    if (targetPosition == 0) {
        doorPosition = "0";
    }
    else {
        doorPosition = "1";
    }

    // Update cache
    thisDevice.cacheDoorPosition = doorPosition;

    // Update position state
    var accessory = this.accessories[thisDevice.name];
    if (accessory){
        accessory.getService(Service.Door).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
    }
    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueDoor, doorPosition, function (err) {
        if (callbackWasCalled) {
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            self.log("%s: successfully set door position to %s", thisDevice.name, targetPosition);
            callback(null, targetPosition);
        } else {
            self.log.error("%s: error setting door position to %s", thisDevice.name, targetPosition);
            callback(err);
        }
    });
}

DomotigaPlatform.prototype.getWindowPositionState = function (accessory, callback) {
    
    //var thisDevice = accessory.context;
    accessory.getService(Service.Window).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED); 

    // At this time the value property of PositionState is always mapped to stopped
    callback(null, Characteristic.PositionState.STOPPED);
}

DomotigaPlatform.prototype.readWindowPosition = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting window position...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueWindow, function (error, result) {
        if (error) {
            self.log.error('%s: readWindowPosition failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {

            var value = (result.toLowerCase() == "0") ? 0 : 100;
            self.log('%s: window position: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getWindowPosition = function (accessory, callback) {
    var self = this;
    var thisDevice = accessory.context;
    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: Cached window position is: %s', thisDevice.name, thisDevice.cacheWindowPosition);
        callback(null, thisDevice.cacheWindowPosition);
    } else {
        // Check value if polling is disabled
        this.readWindowPosition(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheWindowPosition = value;
            callback(error, thisDevice.cacheWindowPosition);
        });
    }
}

DomotigaPlatform.prototype.setWindowPosition = function (accessory, targetPosition, callback) {
    var self = this;
    var thisDevice = accessory.context;
    self.log("%s: setting window position to %s", thisDevice.name, targetPosition);

    // At this time we do not use percentage values: 1 = open, 0 = closed
    var windowPosition;

    if (targetPosition == 0) {
        windowPosition = "0";
    }
    else {
        windowPosition = "100";
    }

    //var moveUp = (windowPosition >= thisDevice.cacheWindowPosition);

    // Update cache
    thisDevice.cacheWindowPosition = windowPosition;
    

    // Update position state
    accessory.getService(Service.Window).setCharacteristic(Characteristic.CurrentPosition, windowPosition);
    accessory.getService(Service.Window).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
      
    //Update the value to iOS
    accessory.getService(Service.Window).getCharacteristic(Characteristic.CURRENTPosition).updateValue(windowPosition);
    
    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueWindow, windowPosition, function (err) {
        if (callbackWasCalled) {
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            self.log("%s: successfully set window position to %s", thisDevice.name, targetPosition);
            callback(null, windowPosition);
        } else {
            self.log.error("%s: error setting window position to %s", thisDevice.name, targetPosition);
            callback(err);
        }
    });
}


DomotigaPlatform.prototype.getWindowCoveringPositionState = function (thisDevice, callback) {
    // At this time the value property of PositionState is always mapped to stopped
    callback(null, Characteristic.PositionState.STOPPED);
}

DomotigaPlatform.prototype.readWindowCoveringPosition = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting window covering position...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueWindowCovering, function (error, result) {
        if (error) {
            self.log.error('%s: readWindowCoveringPosition failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {

            var value = (result.toLowerCase() == "0") ? 0 : 100;
            self.log('%s: window covering position: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

DomotigaPlatform.prototype.getWindowCoveringPosition = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached window covering position is: %s', thisDevice.name, thisDevice.cacheWindowCoveringPosition);
        callback(null, thisDevice.cacheWindowCoveringPosition);
    } else {
        // Check value if polling is disabled
        this.readWindowCoveringPosition(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheWindowCoveringPosition = value;
            callback(error, thisDevice.cacheWindowCoveringPosition);
        });
    }
}

DomotigaPlatform.prototype.setWindowCoveringPosition = function (thisDevice, targetPosition, callback) {
    var self = this;
    self.log("%s: setting window covering position to %s", thisDevice.name, targetPosition);

    // At this time we do not use percentage values: 1 = open, 0 = closed
    var windowcoveringPosition;

    if (targetPosition == 0) {
        windowcoveringPosition = "0";
    }
    else {
        windowcoveringPosition = "1";
    }
    
    // Update cache
    thisDevice.cacheWindowCoveringPosition = windowcoveringPosition;

    
    // Update position state
    var accessory = this.accessories[thisDevice.name];
    if (accessory){
        accessory.getService(Service.WindowCovering).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
        //Update the value to iOS
        accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition).updateValue(windowcoveringPosition);
    }
    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueWindowCovering, windowcoveringPosition, function (err) {
        if (callbackWasCalled) {
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            self.log("%s: successfully set window covering position to %s", thisDevice.name, targetPosition);
            callback(null, windowcoveringPosition);
        } else {
            self.log.error("%s: error setting window covering position to %s", thisDevice.name, targetPosition);
            callback(err);
        }
    });
}

// Lightbulb
DomotigaPlatform.prototype.setLightState = function (thisDevice, value, callback) {
    var self = this;
	
    if (thisDevice.cacheLightState && thisDevice.brightness && value) {
        callback(null);
    } else {
        var LightState = (value == false) ? "Off" : "On";
        if (!thisDevice.cacheLightState && thisDevice.brightness && value) {
            LightState = "Dim " + thisDevice.cacheLightBrightness;
        }
        self.log("%s: setting light state to %s", thisDevice.name, LightState);

        // Update cache
        thisDevice.cacheLightState = value;

        var callbackWasCalled = false;
        this.domotigaSetValue(thisDevice.device, thisDevice.valueLight, LightState, function (err) {
            if (callbackWasCalled) {
                self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
            }
            callbackWasCalled = true;
            if (!err) {
                self.log("%s: successfully set light state to %s", thisDevice.name, LightState);
                callback(null);
            } else {
                self.log.error("%s: error setting light state to %s", thisDevice.name, LightState);
                callback(err);
            }
        });
    }
}

DomotigaPlatform.prototype.readLightState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting light state...", thisDevice.name);

    self.domotigaGetValue(thisDevice.device, thisDevice.valueLight, function (error,result){
        if (error) {
            self.log.error('%s: readLightState failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var LightState = (result == "0") ? 0 : 1;
            self.log('%s: light state: %s', thisDevice.name, LightState);
            callback(null, LightState);
        }
    });
}

DomotigaPlatform.prototype.getLightState = function (thisDevice, callback) {
    var self = this;
    if(thisDevice.polling) {
        self.log('%s: cached light.state is: %s', thisDevice.name, thisDevice.cacheLightState);
        callback(null, thisDevice.cacheLightState);
    } else {
        this.readLightState(thisDevice, function (error, value) {
            if (thisDevice.Brightness == true) {
                if (value == 0) {
                    thisDevice.cacheLightState = 0;
                } else {
                    thisDevice.cacheLightState = value
                }
            } else {
                thisDevice.cacheLightState = value;
            }
            callback(error, thisDevice.cacheLightState);
        });
    }
}

DomotigaPlatform.prototype.setLightBrightnessState = function (thisDevice, value, callback) {

    var self = this;
    var BrightnessState = value;
    switch (value) {
        case 0:
            BrightnessState = "Off";
            break;
        case 100:
            BrightnessState = "On";
            break;
        default:
            BrightnessState = "Dim " + value;
            break;
    }

    self.log("%s: setting light brightness to %s", thisDevice.name, value);

    // Update cache
    thisDevice.cacheLightBrightness = value;

    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueLight, BrightnessState, function (err) {
        if (callbackWasCalled) {
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            self.log("%s: successfully set light brightness to %s", thisDevice.name, BrightnessState);
            callback(null);
        } else {
            self.log.error("%s: error setting light brightness to %s", thisDevice.name, BrightnessState);
            callback(err);
        }
    });
}

DomotigaPlatform.prototype.readLightBrightnessState = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting light brightness...", thisDevice.name);
	
    self.domotigaGetValue(thisDevice.device, thisDevice.valueLight, function (error,result){
        if ( error) {
            self.log.error('%s: readLightBrightnessState failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            self.log('%s: light brightness: %s', thisDevice.name, result);
            callback(null,result);
        }
    });
}

DomotigaPlatform.prototype.getLightBrightnessState = function (thisDevice, callback) {
    var self = this;
    if(thisDevice.polling) {
        self.log('%s: cached light.brightness is: %s', thisDevice.name, thisDevice.cacheLightBrightness);
        callback(null, thisDevice.cacheLightBrightness);
    } else {
        this.readLightBrightnessState(thisDevice, function (error, value) {
            thisDevice.cacheLightBrightness = value;
            callback(error, thisDevice.cacheLightBrightness);
        });
    }
}

DomotigaPlatform.prototype.setTargetTemperature = function (thisDevice, value, callback) {

    var self = this;

    self.log("%s: setting target temperature to %s", thisDevice.name, value);

    // Update cache
    thisDevice.cacheTargetTemperature = value;

    var callbackWasCalled = false;
    this.domotigaSetValue(thisDevice.device, thisDevice.valueTargetTemperature, value, function (err) {
        if (callbackWasCalled) {
            self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            self.log("%s: successfully set target temperature to %s", thisDevice.name, value);
            callback(null);
        } else {
            self.log.error("%s: error setting target temperature to %s", thisDevice.name, value);
            callback(err);
        }
    });
}

DomotigaPlatform.prototype.readTargetTemperature = function (thisDevice, callback) {
    var self = this;
    self.log("%s: getting target temperature...", thisDevice.name);

    this.domotigaGetValue(thisDevice.device, thisDevice.valueTargetTemperature, function (error, result) {
        if (error) {
            self.log.error('%s: readTargetTemperature failed: %s', thisDevice.name, error.message);
            callback(error);
        } else {
            var value = Number(result);
            self.log('%s: target temperature: %s', thisDevice.name, value);
            callback(null, value);
        }
    });
}

// Method to determine target temperature
DomotigaPlatform.prototype.getTargetTemperature = function (thisDevice, callback) {
    var self = this;

    if (thisDevice.polling) {
        // Get value directly from cache if polling is enabled
        self.log('%s: cached temperature is: %s', thisDevice.name, thisDevice.cacheTargetTemperature);
        callback(null, thisDevice.cacheTargetTemperature);
    } else {
        // Check value if polling is disabled
        this.readTargetTemperature(thisDevice, function (error, value) {
            // Update cache
            thisDevice.cacheTargetTemperature = value;
            callback(error, thisDevice.cacheTargetTemperature);
        });
    }
}


DomotigaPlatform.prototype.getTargetHeatingCoolingState = function (thisDevice, callback) {
    this.log("%s: getting TargetHeatingCoolingState...", thisDevice.name);
    callback(null, thisDevice.cacheTargetHeatingCoolingState);
}


DomotigaPlatform.prototype.setTargetHeatingCoolingState = function (thisDevice, value, callback) {
    var self = this;
    var command = "0";

    this.log("%s: setting TargetHeatingCoolingState to %s", thisDevice.name, value);
    //value must be one of the following:
    //Characteristic.TargetHeatingCoolingState.OFF = 0;
    //Characteristic.TargetHeatingCoolingState.HEAT = 1;
    //Characteristic.TargetHeatingCoolingState.COOL = 2;
    //Characteristic.TargetHeatingCoolingState.AUTO = 3;

    // Update cache
    thisDevice.cacheTargetHeatingCoolingState = value;

    //Only turn off Thermostat override if TargetHeatingCoolingState.OFF
    if (value == Characteristic.TargetHeatingCoolingState.OFF){
        var callbackWasCalled = false;
        this.domotigaSetValue(thisDevice.device, thisDevice.valueTargetTemperature, command, function (err) {
            if (callbackWasCalled) {
                self.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
            }
            callbackWasCalled = true;
            if (!err) {
                self.log("%s: successfully send turning off thermostat override command.", thisDevice.name);
                callback(null);
            } else {
                self.log.error("%s: error sending turning off thermostat override command.", thisDevice.name);
                callback(err);
            }
        });
    } else {
        self.log("%s: ignore setting TargetHeatingCoolingState because of no support at DomotiGa.", thisDevice.name);
        callback(null);
    }
}




// Method to handle identify request
DomotigaPlatform.prototype.identify = function (thisDevice, paired, callback) {
    this.log("%s: identify requested", thisDevice.name);
    callback();
}

// Set value at domotiga database
DomotigaPlatform.prototype.domotigaSetValue = function (device, deviceValueNo, value, callback) {

    var self = this;
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
            self.log.error("Sorry err: ", err);
            callback(err);
        } else {
            callback();
        }
    });
}

// Get value from domotiga database
DomotigaPlatform.prototype.domotigaGetValue = function (device, deviceValueNo, callback) {

    //skip request if value doesn't exist in domotiga 
    if (deviceValueNo != 99) {
        var self = this;
        //self.log( "domotigaGetValue, device : %s - deviceValueNo : ",device, deviceValueNo);
        JSONRequest('http://' + self.host + ':' + self.port, {
            jsonrpc: "2.0",
            method: "value.get",
            params: {
                "device_id": device,
                "valuenum": deviceValueNo,
                "command" : "value"
            },
            id: 1
        }, function (err, data) {
            if (err) {
                self.log.error("Sorry err: ", err);
                callback(err);
            } else {
                let item = Number(deviceValueNo) - 1;
                //self.log("data.result:", data.result);
                //self.log("data.result.value:", data.result.value);
                if (data.result != undefined){
                    // try to convert
                    if ( typeof data.result.value == "string" && (data.result.value.toLowerCase() == "on" || data.result.value.toLowerCase() == "true")) {
                        callback(null,1);
                    } else if ( typeof data.result.value == "string" && (data.result.value.toLowerCase() == "off" || data.result.value.toLowerCase() == "false")) {
                        callback(null,0);
                    } else if ( typeof data.result.value == "string" && (data.result.value.substr(0,3).toLowerCase() == "dim")) {
                        callback(null, data.result.value.substr(4).toLowerCase())
                    } else {
                        callback(null, data.result.value);
                    }
                } else {
                    self.log.warn("Undefined data for device %s, value %s", device, deviceValueNo);
                    callback();
                }
            }
        });
    } else {
        callback(null, 0)
    }
}

DomotigaPlatform.prototype.getVersion = function () {
    var pjPath = path.join(__dirname, './package.json');
    var pj = JSON.parse(fs.readFileSync(pjPath));
    return pj.version;
}

DomotigaPlatform.prototype.fetch_npmVersion = function (pck, callback) {
    var exec = require('child_process').exec;
    var cmd = 'npm view ' + pck + ' version';
    exec(cmd, function (error, stdout, stderr) {
        var npm_version = stdout;
        npm_version = npm_version.replace('\n', '');
        callback(npm_version);
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
