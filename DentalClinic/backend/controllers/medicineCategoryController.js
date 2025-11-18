const MedicineCategory = require('../models/MedicineCategory');
const Medicine = require('../models/Medicine');

const medicineCategoryController = {
    createMedicineCategory: async (req, res) => {
        try {
            const { name } = req.body;
            const existingCategory = await MedicineCategory.findOne({ name });

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Name is required' });
            }

            if (existingCategory) {
                return res.status(400).json({ message: 'Medicine category already exists' });
            }
            const newCategory = new MedicineCategory({ name });
            await newCategory.save();
            res.status(201).json({
                message: 'Medicine category created successfully',
                category: newCategory
            });
        } catch (error) {
            console.error('Error creating medicine category:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getAllMedicineCategories: async (req, res) => {
        try {
            const categories = await MedicineCategory.find();
            res.status(200).json({
                message: 'Medicine categories fetched successfully',
                categories
            });
        } catch (error) {
            console.error('Error fetching medicine categories:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getMedicineCategoryById: async (req, res) => {
        try {
            const { id } = req.params;
            const category = await MedicineCategory.findById(id);
            if (!category) {
                return res.status(404).json({ message: 'Medicine category not found' });
            }
            res.status(200).json({
                message: 'Medicine category fetched successfully',
                category
            });
        } catch (error) {
            console.error('Error fetching medicine category by id:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    updateMedicineCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Name is required' });
            }
            const updatedCategory = await MedicineCategory.findByIdAndUpdate(
                id,
                { name },
                { new: true, runValidators: true }
            );

            if (!updatedCategory) {
                return res.status(404).json({ message: 'Medicine category not found' });
            }

            res.status(200).json({
                message: 'Medicine category updated successfully',
                category: updatedCategory
            });
        } catch (error) {
            console.error('Error updating medicine category:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    deleteMedicineCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedCategory = await MedicineCategory.findByIdAndDelete(id);

            if (!deletedCategory) {
                return res.status(404).json({ message: 'Medicine category not found' });
            }

            await Medicine.deleteMany({ medicineCategory: id });

            res.status(200).json({
                message: 'Medicine category and related medicines deleted successfully',
                category: deletedCategory
            });
        } catch (error) {
            console.error('Error deleting medicine category:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = medicineCategoryController;