const Medicine = require('../models/Medicine');
const MedicineCategory = require('../models/MedicineCategory');

const medicineController = {
    createMedicine: async (req, res) => {
        try {
            const { medicineCategory, name, unit, price, origin, manufacturer } = req.body;

            if (!name) {
                return res.status(400).json({ message: 'Name is required' });
            }
            if (!medicineCategory) {
                return res.status(400).json({ message: 'Medicine category is required' });
            }
            if (!unit) {
                return res.status(400).json({ message: 'Unit is required' });
            }
            if (price === undefined || price === null) {
                return res.status(400).json({ message: 'Price is required' });
            }
            const priceNum = Number(price);
            if (Number.isNaN(priceNum) || priceNum <= 0) {
                return res.status(400).json({ message: 'Price must be greater than 0' });
            }
            if (!origin) {
                return res.status(400).json({ message: 'Origin is required' });
            }
            if (!manufacturer) {
                return res.status(400).json({ message: 'Manufacturer is required' });
            }

            const cat = await MedicineCategory.findById(medicineCategory);
            if (!cat) return res.status(404).json({ message: 'Medicine category does not exist' });

            const exists = await Medicine.findOne({ medicineCategory, name: name.trim() });
            if (exists) return res.status(400).json({ message: 'Medicine already exist in this category' });

            const med = new Medicine({
                medicineCategory,
                name: name.trim(),
                unit: unit.trim(),
                price: priceNum,
                origin: origin.trim(),
                manufacturer: manufacturer.trim()
            });
            await med.save();

            const populated = await med.populate('medicineCategory', 'name');
            return res.status(201).json({ message: 'Successful medicine creation', medicine: populated });
        } catch (error) {
            console.error('Error creating medicine:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    getAllMedicines: async (req, res) => {
        try {
            const medicines = await Medicine.find().populate('medicineCategory', 'name');
            return res.status(200).json({ message: 'Get medication list successfully', medicines });
        } catch (error) {
            console.error('Error fetching medicines:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    getMedicineById: async (req, res) => {
        try {
            const { id } = req.params;
            const medicine = await Medicine.findById(id).populate('medicineCategory', 'name');
            if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
            return res.status(200).json({ message: 'Get medicine successfully', medicine });
        } catch (error) {
            console.error('Error fetching medicine by id:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    updateMedicine: async (req, res) => {
        try {
            const { id } = req.params;
            const { medicineCategory, name, unit, price, origin, manufacturer } = req.body;

            if (!name) {
                return res.status(400).json({ message: 'Name is required' });
            }
            if (!medicineCategory) {
                return res.status(400).json({ message: 'Medicine category is required' });
            }
            if (!unit) {
                return res.status(400).json({ message: 'Unit is required' });
            }
            if (price === undefined || price === null) {
                return res.status(400).json({ message: 'Price is required' });
            }
            const priceNum = Number(price);
            if (Number.isNaN(priceNum) || priceNum <= 0) {
                return res.status(400).json({ message: 'Price must be greater than 0' });
            }
            if (!origin) {
                return res.status(400).json({ message: 'Origin is required' });
            }
            if (!manufacturer) {
                return res.status(400).json({ message: 'Manufacturer is required' });
            }

            if (medicineCategory) {
                const cat = await MedicineCategory.findById(medicineCategory);
                if (!cat) return res.status(404).json({ message: 'Medicine category does not exist' });
            }

            if (name !== undefined || medicineCategory) {
                const current = await Medicine.findById(id);
                if (!current) return res.status(404).json({ message: 'Medicine not found' });

                const targetCategory = medicineCategory || current.medicineCategory;
                const targetName = (name !== undefined ? String(name) : current.name).trim();

                const dup = await Medicine.findOne({
                    _id: { $ne: id },
                    medicineCategory: targetCategory,
                    name: targetName
                });
                if (dup) return res.status(400).json({ message: 'Medicine already exist in this category' });
            }

            const updated = await Medicine.findByIdAndUpdate(
                id,
                {
                    ...(medicineCategory && { medicineCategory }),
                    ...(name !== undefined && { name: String(name).trim() }),
                    ...(unit !== undefined && { unit: String(unit).trim() }),
                    ...(price !== undefined && { price: priceNum }),
                    ...(origin !== undefined && { origin: String(origin).trim() }),
                    ...(manufacturer !== undefined && { manufacturer: String(manufacturer).trim() })
                },
                { new: true, runValidators: true }
            ).populate('medicineCategory', 'name');

            if (!updated) return res.status(404).json({ message: 'Medicine not found' });
            return res.status(200).json({ message: 'Medicine update successfully', medicine: updated });
        } catch (error) {
            console.error('Error updating medicine:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    deleteMedicine: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await Medicine.findByIdAndDelete(id);
            if (!deleted) return res.status(404).json({ message: 'Medicine not found' });
            return res.status(200).json({ message: 'Medicine delete successfully', medicine: deleted });
        } catch (error) {
            console.error('Error deleting medicine:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = medicineController;
