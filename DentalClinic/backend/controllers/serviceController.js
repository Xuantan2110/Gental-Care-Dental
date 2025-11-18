const Service = require("../models/Service");
const mongoose = require("mongoose");

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (v === 1 || v === 0) return Boolean(v);
  return undefined;
};
const toNum = (v) => (v === undefined ? undefined : Number(v));

const serviceController = {
  createService: async (req, res) => {
    try {
      const { name, description, duration, price, type, guarantee, isBookingService } = req.body;

      const doc = new Service({
        name,
        description,
        duration: toNum(duration),
        price: toNum(price),
        type,
        guarantee,
        isBookingService: toBool(isBookingService) ?? false,
      });

      await doc.save();
      res.status(201).json({ message: "Create service successfully", service: doc });
    } catch (error) {
      console.error("Failed to create service:", error);
      res.status(500).json({ message: "An error occurred while creating the service", error });
    }
  },

  getAllServices: async (req, res) => {
    try {
      const services = await Service.find();
      res.status(200).json({ message: "Get all service successfully", services });
    } catch (error) {
      res.status(500).json({ message: 'An error occurred while fetching services', error });
    }
  },

  deleteService: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid service id" });
      }
      const deleted = await Service.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ message: "Service not found" });
      res.status(200).json({ message: "Delete service successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting service", error });
    }
  },

  getServiceById: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid service id" });
      }
      const service = await Service.findById(id);
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.status(200).json({ message: "Get service by ID successfully", service });
    } catch (error) {
      console.error("Failed to get service by ID:", error);
      res.status(500).json({ message: "An error occurred while fetching the service", error });
    }
  },

  updateService: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid service id" });
      }

      const {
        name,
        description,
        duration,
        price,
        type,
        guarantee,
        isBookingService,
      } = req.body;

      const service = await Service.findById(id);
      if (!service) return res.status(404).json({ message: "Service not found" });

      if (name !== undefined) service.name = name;
      if (description !== undefined) service.description = description;
      if (duration !== undefined) service.duration = toNum(duration);
      if (price !== undefined) service.price = toNum(price);
      if (type !== undefined) service.type = type;
      if (guarantee !== undefined) service.guarantee = guarantee;
      if (isBookingService !== undefined) service.isBookingService = toBool(isBookingService);

      await service.save();
      res.status(200).json({ message: "Update service successfully", service });
    } catch (error) {
      console.error("Failed to update service:", error);
      res.status(500).json({ message: "An error occurred while updating the service", error });
    }
  },

  getBookingServices: async (req, res) => {
    try {
      const services = await Service.find({ isBookingService: true });
      res.status(200).json({ message: "Get booking services successfully", services });
    } catch (error) {
      console.error("Failed to get booking services:", error);
      res.status(500).json({ message: "An error occurred while fetching booking services", error });
    }
  },

  getNonBookingServices: async (req, res) => {
    try {
      const services = await Service.find({ isBookingService: false });
      res.status(200).json({ message: "Get non-booking services successfully", services });
    } catch (error) {
      console.error("Failed to get non-booking services:", error);
      res.status(500).json({ message: "An error occurred while fetching non-booking services", error });
    }
  },


}

module.exports = serviceController;