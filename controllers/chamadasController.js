import mongoose from "mongoose";
import chamadaModel from "../models/chamadaModel.js";
import chamadaCustomInputModel from "../models/chamadaCustomInputModel.js";

// Criar uma nova chamada
const createChamada = async (req, res) => {
  const { nome, dataInicio, dataFim, lag, long, ativa, customInputs } = req.body;

  let {toleranceMeters} = req.body;

  toleranceMeters = Math.max(100, toleranceMeters)

  try {
    const novaChamada = await chamadaModel.create({
      nome,
      dataInicio,
      dataFim,
      lag,
      long,
      toleranceMeters,
      ativa,
    });

    customInputs.forEach(async (input)=>{
      await chamadaCustomInputModel.create({
        id_chamada: novaChamada._id,
        label: input.label,
        placeholder: input.placeholder,
        type: input.type
      })
    })

    res.status(201).json({ success: true, chamada: novaChamada });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erro ao criar chamada", error: err });
  }
};

// Listar todas as chamadas
const getChamadas = async (req, res) => {
  try {
    const chamadas = await chamadaModel.find();
    res.status(200).json({ success: true, chamadas });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erro ao buscar chamadas", error: err });
  }
};

// Listar uma chamada
const getChamada = async (req, res) => {
  const {id} = req.params
  // Verificar se o ID é válido
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "ID da chamada inválido" });
  }
  try {
    let chamada = await chamadaModel.findById(id);

    if(!chamada) {
      return res.status(400).json({ success: false, message: "Chamada não existe mais" });
    }
    
    chamada = chamada.toObject();
    const customInputs = await chamadaCustomInputModel.find({id_chamada: id});
    chamada.customInputs = customInputs

    res.status(200).json({ success: true, chamada });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erro ao buscar chamadas", error: err });
  }
};

// Atualizar uma chamada
const addCustomInput = async (req, res) => {
  const { id } = req.params;

  try {
    // Atualizar os campos da chamada
    const chamada = await chamadaModel.findById(id);
    if (!chamada) {
      return res.status(404).json({ success: false, message: "Chamada não encontrada" });
    }

    const newInput = await chamadaCustomInputModel.create({
      id_chamada: id,
      label: "Input Personalizado",
      type: "text",
      placeholder: "Descreva brevemente o que colocar aqui"
    })

    res.status(200).json({ success: true, newInput });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao atualizar chamada", error: err });
  }
};

const deleteCustomInput = async (req, res) => {
  const { id } = req.params;

  try {
    // Atualizar os campos da chamada
    const deleted = await chamadaCustomInputModel.findOneAndDelete({_id: id});

    if(!deleted) res.status(400).json({ success: false, message: "Esse input não existe mais"});
    let customInputs = await chamadaCustomInputModel.find({id_chamada: deleted.id_chamada});

    res.status(200).json({ success: true, customInputs});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao atualizar chamada", error: err });
  }
};

// Atualizar uma chamada
const updateChamada = async (req, res) => {
  const { id } = req.params;
  const { customInputs, ...updates } = req.body; // Separar os inputs personalizados dos outros campos

  console.log(updates)

  try {
    // Atualizar os campos da chamada
    const chamadaAtualizada = await chamadaModel.findByIdAndUpdate(id, updates.chamada, { new: true });
    if (!chamadaAtualizada) {
      return res.status(404).json({ success: false, message: "Chamada não encontrada" });
    }

    // Atualizar os inputs personalizados
    if (customInputs && Array.isArray(customInputs)) {
      for (const input of customInputs) {
        if (input._id) {
          // Atualizar input existente
          await chamadaCustomInputModel.findByIdAndUpdate(input._id, {
            label: input.label,
            placeholder: input.placeholder,
            type: input.type,
          });
        } else {
          // Criar novo input personalizado
          await chamadaCustomInputModel.create({
            id_chamada: id,
            label: input.label,
            placeholder: input.placeholder,
            type: input.type,
          });
        }
      }
    }

    res.status(200).json({ success: true, chamada: chamadaAtualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao atualizar chamada", error: err });
  }
};

// Excluir uma chamada
const deleteChamada = async (req, res) => {
  const { id } = req.params;

  try {
    const chamadaExcluida = await chamadaModel.findByIdAndDelete(id);

    if (!chamadaExcluida) {
      res.status(404).json({ success: false, message: "Chamada não encontrada" });
      return;
    }

    res.status(200).json({ success: true, message: "Chamada excluída com sucesso" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erro ao excluir chamada", error: err });
  }
};

export { createChamada, getChamada, getChamadas, updateChamada, deleteCustomInput, deleteChamada, addCustomInput };