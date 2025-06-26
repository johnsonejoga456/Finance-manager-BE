import Investment from '../models/Investment.js';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import asyncHandler from 'express-async-handler';

const getInvestments = asyncHandler(async (req, res) => {
  const { page = '1', limit = 10 } = req.query;
  const userId = req.user._id;

  const investments = await Investment.find({ userId })
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .sort({ purchaseDate: -1 });

  const total = await Investment.countDocuments({ userId });

  res.json({ investments, total });
});


const addInvestment = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      type,
      initialInvestment,
      currentValue,
      currency,
      institution,
      purchaseDate,
      notes
    } = req.body;

    const userId = req.user._id;

    if (!name || !type || !initialInvestment || !currentValue || !currency || !purchaseDate) {
      res.status(400);
      throw new Error('All required fields must be provided');
    }

    const investment = await Investment.create({
      name,
      type,
      initialInvestment: parseFloat(initialInvestment),
      currentValue: parseFloat(currentValue),
      currency,
      institution,
      purchaseDate,
      notes,
      userId,
    });

    res.status(201).json(investment);
  } catch (error) {
    console.error('Error adding investment:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});


const updateInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    initialInvestment,
    currentValue,
    currency,
    institution,
    purchaseDate,
    notes
  } = req.body;
  const userId = req.user._id;

  const investment = await Investment.findOne({ _id: id, userId });

  if (!investment) {
    res.status(404);
    throw new Error('Investment not found');
  }

  investment.name = name || investment.name;
  investment.type = type || investment.type;
  investment.initialInvestment = initialInvestment ? parseFloat(initialInvestment) : investment.initialInvestment;
  investment.currentValue = currentValue ? parseFloat(currentValue) : investment.currentValue;
  investment.currency = currency || investment.currency;
  investment.institution = institution || investment.institution;
  investment.purchaseDate = purchaseDate || investment.purchaseDate;
  investment.notes = notes || investment.notes;

  await investment.save();

  res.json(investment);
});

const deleteInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const investment = await Investment.findOne({ _id: id, userId });

  if (!investment) {
    res.status(404);
    throw new Error('Investment not found');
  }

  await investment.deleteOne();

  res.json({ message: 'Investment deleted' });
});


const exportToCSV = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const investments = await Investment.find({ userId });

  const fields = [
    'name',
    'type',
    'initialInvestment',
    'currentValue',
    'currency',
    'institution',
    'purchaseDate',
    'notes'
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(investments);

  res.header('Content-Type', 'text/csv');
  res.attachment('investments.csv');
  res.send(csv);
});


const exportToPDF = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const investments = await Investment.find({ userId });

  const doc = new PDFDocument();
  let buffers = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.header('Content-Type', 'application/pdf');
    res.attachment('investments.pdf');
    res.send(pdfData);
  });

  doc.fontSize(16).text('Investment Portfolio', { align: 'center' });
  doc.moveDown();

  investments.forEach((inv, index) => {
    doc.fontSize(12).text(`${index + 1}. ${inv.name}`);
    doc.text(`Type: ${inv.type}`);
    doc.text(`Initial Investment: $${inv.initialInvestment.toFixed(2)}`);
    doc.text(`Current Value: $${inv.currentValue.toFixed(2)}`);
    doc.text(`Return: ${
      inv.initialInvestment > 0
        ? (((inv.currentValue - inv.initialInvestment) / inv.initialInvestment) * 100).toFixed(2)
        : '0.00'
    }%`);
    doc.text(`Currency: ${inv.currency}`);
    doc.text(`Institution: ${inv.institution || '-'}`);
    doc.text(`Purchase Date: ${new Date(inv.purchaseDate).toLocaleDateString()}`);
    doc.text(`Notes: ${inv.notes || '-'}`);
    doc.moveDown();
  });

  doc.end();
});

export {
  getInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  exportToCSV,
  exportToPDF
};