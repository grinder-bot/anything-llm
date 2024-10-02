const winston = require("winston");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");

class Logger {
  logger = console;
  static _instance;
  constructor() {
    if (Logger._instance) return Logger._instance;
    this.logger =
      process.env.NODE_ENV === "production" ? this.getWinstonLogger() : console;
    Logger._instance = this;
  }

  getWinstonLogger() {
    const logtail = new Logtail(process.env.SERVER_BETTER_STACK);

    const logger = winston.createLogger({
      level: "info",
      defaultMeta: { service: "backend" },
      transports: [new LogtailTransport(logtail)],
    });

    console.log = function () {
      return logger.info.apply(logger, arguments);
    };
    console.error = function () {
      return logger.error.apply(logger, arguments);
    };
    console.info = function () {
      return logger.warn.apply(logger, arguments);
    };
    return logger;
  }
}

/**
 * Sets and overrides Console methods for logging when called.
 * This is a singleton method and will not create multiple loggers.
 * @returns {winston.Logger | console} - instantiated logger interface.
 */
function setLogger() {
  return new Logger().logger;
}
module.exports = setLogger;
