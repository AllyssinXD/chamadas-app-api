import presenceModel from "../models/presenceModel.js";
import chamadaModel from "../models/chamadaModel.js";
import axios from "axios"
import mongoose from "mongoose";
import chamadaInputValueModel from "../models/chamadaInputValueModel.js";
import chamadaCustomInputModel from "../models/chamadaCustomInputModel.js";

// Criar uma nova chamada
const confirmPresence = async (req, res) => {
  const { nome, lag, long } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.body.ip;
  const { chamadaId } = req.params;
  const { customInputs } = req.body;
  
if(!nome || !lag || !long || !ip || !chamadaId) return res.status(400).json({sucess: false, message: "campos não podem ser vazios"})

    // Verificar se o ID é válido
  if (!mongoose.Types.ObjectId.isValid(chamadaId)) {
    return res.status(400).json({ success: false, message: "ID da chamada inválido" });
  }

  try {
   const chamada = await chamadaModel.findOne({ _id: chamadaId });
    
    console.log(chamada)

    if(!chamada)  return res.status(400).json({sucess: false, message: "chamada não existe"})
    if (!chamada.ativa) return res.status(400).json({sucess: false, message: "chamada não está mais ativa"})

    const ipInfo = await axios.get("http://ip-api.com/json/"+ip)
    const locationInfo = await getAddress(lag, long)

    console.log(locationInfo)
    if (locationInfo.error) {
      return res.status(400).json({
        success: false,
        message: `Localização inválida`,
      });
    }
    if(ipInfo.data.city != locationInfo.cidade ) return res.status(400).json({sucess: false, message: "informações do ip não correspondem"})

    const distance = calculateDistance(lag, long, chamada.lag, chamada.long);
    const margin = chamada.toleranceMeters;
    if (distance > margin) {
      return res.status(400).json({
        success: false,
        message: `Você está fora do alcance permitido. Distância: ${distance.toFixed(2)} metros`,
      });
    }

    const dataAgora = Date.now();
    const dataInicio = new Date(chamada.dataInicio)
    const dataFim = new Date(chamada.dataFim)
    
    if (dataAgora < dataInicio) {
        return res.status(400).json({
            success: false,
            message: `Essa chamada ainda não começou.`,
        });
    }

    if (dataAgora > dataFim) {
        return res.status(400).json({
            success: false,
            message: `Essa chamada já expirou.`,
        });
    }

    const exists = await presenceModel.find({id_chamada: chamadaId, ip});

    if(exists.length > 0){
        return res.status(400).json({
        success: false,
        message: `Esse IP já foi usado para responder a chamada.`,
      });
    }

    const newPresence = await presenceModel.create({nome, long, lag, envio: dataAgora, ip, id_chamada: chamadaId})

    for (const key of Object.keys(customInputs)) {
        await chamadaInputValueModel.create({id_input: key, value: customInputs[key], presence_id: newPresence._id})
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: "Erro ao confirmar chamada", error: err });
  }
};

// Função para calcular a distância entre duas coordenadas (em metros)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
}

async function getAddress(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse`;

  const response = await axios.get(url, {
    params: {
      lat,
      lon,
      format: "json"
    },
    headers: {
      "User-Agent": "ChamadasApp/1.0" // Nominatim exige isso
    }
  });

  const data = response.data;
if (data.error) return {error: data.error}

  return {
    cidade: data.address.city || data.address.town || data.address.village,
    estado: data.address.state,
    pais: data.address.country,
    enderecoCompleto: data.display_name
  };
}

const getAllPresencesFromChamada = async (req, res) => {
  const { chamadaId } = req.params;

  try {
    // Verificar se a chamada existe
    const chamada = await chamadaModel.findById(chamadaId);
    if (!chamada) {
      return res.status(400).json({ success: false, message: "Chamada não existe" });
    }

    // Buscar presenças e inputs personalizados
    const presences = await presenceModel.find({ id_chamada: chamadaId });
    const customInputs = await chamadaCustomInputModel.find({ id_chamada: chamadaId });

    // Popular presenças com valores dos inputs personalizados
    const populatedPresences = await Promise.all(
      presences.map(async (presence) => {
        const customValues = {};

        for (const input of customInputs) {
          const value = await chamadaInputValueModel.findOne({
            id_input: input._id,
            presence_id: presence._id,
          });

          customValues[input._id] = value ? value.value : null; // Adicionar valor ou `null` se não existir
        }

        return { ...presence.toObject(), customValues }; // Retornar presença com valores personalizados
      })
    );

    // Retornar os dados
    return res.status(200).json({
      success: true,
      customInputs,
      populatedPresences,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar presenças da chamada",
      error: err.message,
    });
  }
};

export { confirmPresence, getAllPresencesFromChamada };