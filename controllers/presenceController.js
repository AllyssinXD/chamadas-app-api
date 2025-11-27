import presenceModel from "../models/presenceModel.js";
import chamadaModel from "../models/chamadaModel.js";
import axios from "axios"
import mongoose from "mongoose";
import chamadaInputValueModel from "../models/chamadaInputValueModel.js";
import chamadaCustomInputModel from "../models/chamadaCustomInputModel.js";

const confirmPresence = async (req, res) => {
  const { nome, lag, long } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.body.ip;
  const { chamadaId } = req.params;
  const { customInputs } = req.body;

  console.log("Iniciando confirmação de presença...");
  console.log("Dados recebidos:", { nome, lag, long, ip, chamadaId, customInputs });

  if (!nome || !lag || !long || !ip || !chamadaId) {
    console.log("Erro: Campos obrigatórios estão vazios.");
    return res.status(400).json({ success: false, message: "Campos não podem ser vazios" });
  }

  // Verificar se o ID é válido
  if (!mongoose.Types.ObjectId.isValid(chamadaId)) {
    console.log("Erro: ID da chamada inválido.");
    return res.status(400).json({ success: false, message: "ID da chamada inválido" });
  }

  try {
    console.log("Buscando chamada no banco de dados...");
    const chamada = await chamadaModel.findOne({ _id: chamadaId });
    console.log("Chamada encontrada:", chamada);

    if (!chamada) {
      console.log("Erro: Chamada não existe.");
      return res.status(400).json({ success: false, message: "Chamada não existe" });
    }

    if (!chamada.ativa) {
      console.log("Erro: Chamada não está ativa.");
      return res.status(400).json({ success: false, message: "Chamada não está mais ativa" });
    }

    console.log("Buscando informações do IP...");
    const ipInfo = await axios.get("http://ip-api.com/json/" + ip);
    console.log("Informações do IP:", ipInfo.data);

    console.log("Buscando informações de localização...");
    const locationInfo = await getAddress(lag, long);
    console.log("Informações de localização:", locationInfo);

    if (locationInfo.error) {
      console.log("Erro: Localização inválida.");
      return res.status(400).json({
        success: false,
        message: `Localização inválida`,
      });
    }

    if (ipInfo.data.city !== locationInfo.cidade) {
      console.log("Erro: Informações do IP não correspondem à localização.");
      return res.status(400).json({
        success: false,
        message: "Informações do IP não correspondem",
      });
    }

    console.log("Calculando distância...");
    const distance = calculateDistance(lag, long, chamada.lag, chamada.long);
    console.log(`Distância calculada: ${distance} metros`);

    const margin = chamada.toleranceMeters;
    if (distance > margin) {
      console.log("Erro: Fora do alcance permitido.");
      return res.status(400).json({
        success: false,
        message: `Você está fora do alcance permitido. Distância: ${distance.toFixed(2)} metros`,
      });
    }

    console.log("Verificando se a chamada está dentro do período permitido...");
    const dataAgora = Date.now();
    const dataInicio = new Date(chamada.dataInicio);
    const dataFim = new Date(chamada.dataFim);

    console.log("Data atual:", dataAgora);
    console.log("Data de início:", dataInicio);
    console.log("Data de fim:", dataFim);

    if (dataAgora < dataInicio) {
      console.log("Erro: Chamada ainda não começou.");
      return res.status(400).json({
        success: false,
        message: `Essa chamada ainda não começou.`,
      });
    }

    if (dataAgora > dataFim) {
      console.log("Erro: Chamada já expirou.");
      return res.status(400).json({
        success: false,
        message: `Essa chamada já expirou.`,
      });
    }

    console.log("Verificando se o IP já foi usado...");
    const exists = await presenceModel.find({ id_chamada: chamadaId, ip });
    console.log("Presenças existentes para este IP:", exists);

    if (exists.length > 0) {
      console.log("Erro: IP já foi usado para responder a chamada.");
      return res.status(400).json({
        success: false,
        message: `Esse IP já foi usado para responder a chamada.`,
      });
    }

    console.log("Criando nova presença...");
    const newPresence = await presenceModel.create({
      nome,
      long,
      lag,
      envio: dataAgora,
      ip,
      id_chamada: chamadaId,
    });
    console.log("Nova presença criada:", newPresence);

    console.log("Salvando valores dos inputs personalizados...");
    for (const key of Object.keys(customInputs)) {
      const inputValue = await chamadaInputValueModel.create({
        id_input: key,
        value: customInputs[key],
        presence_id: newPresence._id,
      });
      console.log("Input personalizado salvo:", inputValue);
    }

    console.log("Confirmação de presença concluída com sucesso.");
    res.status(201).json({ success: true });
  } catch (err) {
    console.log("Erro ao confirmar presença:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao confirmar chamada",
      error: err.message,
    });
  }
};

export { confirmPresence, getAllPresencesFromChamada };