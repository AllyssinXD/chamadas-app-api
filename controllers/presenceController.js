import presenceModel from "../models/presenceModel.js";
import chamadaModel from "../models/chamadaModel.js";
import axios from "axios"
import mongoose from "mongoose";
import chamadaInputValueModel from "../models/chamadaInputValueModel.js";
import chamadaCustomInputModel from "../models/chamadaCustomInputModel.js";
import ExcelJS from "exceljs"
import {v4} from "uuid"

const exportChamada = async (req, res) => {
  const { chamadaId } = req.params;

  try {
    // 1. Buscar presenças e inputs personalizados
    const presences = await presenceModel.find({ id_chamada: chamadaId });
    const customInputs = await chamadaCustomInputModel.find({ id_chamada: chamadaId });

    // 2. Buscar todos os valores de inputs
    const allValues = await chamadaInputValueModel.find({
      presence_id: { $in: presences.map(p => p._id) }
    });

    // Organizar values por presenceId
    const valuesByPresence = {};
    allValues.forEach(v => {
      if (!valuesByPresence[v.presence_id]) valuesByPresence[v.presence_id] = {};
      valuesByPresence[v.presence_id][v.id_input] = v.value;
    });

    // 3. Criar workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Presenças");

    // 4. Criar colunas fixas
    const columns = [
      { header: "Nome", key: "nome", width: 25 },
      { header: "Latitude", key: "lag", width: 12 },
      { header: "Longitude", key: "long", width: 12 },
      { header: "IP", key: "ip", width: 18 },
      { header: "Data de Envio", key: "envio", width: 22 },
    ];

    // 5. Criar colunas dinâmicas dos inputs personalizados
    customInputs.forEach(input => {
      columns.push({
        header: capitalizeFirstLetter(input.label),
        key: input._id.toString(), // id único do input vira coluna
        width: 20,
      });
    });

    worksheet.columns = columns;

    // 6. Preencher linhas
    presences.forEach(p => {
      const row = {
        nome: p.nome,
        lag: p.lag,
        long: p.long,
        ip: p.ip,
        envio: new Date(p.envio).toLocaleString("pt-BR"),
      };

      // preencher inputs personalizados
      customInputs.forEach(input => {
        row[input._id] = valuesByPresence[p._id]?.[input._id] || "";  
      });

      worksheet.addRow(row);
    });

    // 7. Enviar arquivo dividido corretamente
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=presencas-${chamadaId}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.status(200).end();

  } catch (err) {
    console.error("Erro ao gerar Excel:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao gerar Excel",
      error: err.message,
    });
  }
};


const confirmPresence = async (req, res) => {
  const { nome, lag, long } = req.body;
  const uuid = req.headers["user-agent"];
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.body.ip;
  const { chamadaId } = req.params;
  const { customInputs } = req.body;

  console.log("Iniciando confirmação de presença...");
  console.log("Dados recebidos:", { nome, lag, long, ip, chamadaId, customInputs });

  if (!nome || !lag || !long || !ip || !chamadaId || !uuid) {
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

    console.log("Comparando Estado");
    if(locationInfo.estado != ipInfo.data.region)  {
      console.log("Erro: Localização de IP em outro estado do pais.");
      return res.status(400).json({
        success: false,
        message: `Localização de IP em outro estado do pais. Tente conectar em um roteador local ou desligue sua VPN.`,
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

    console.log("Verificando se o UUID já foi usado...");
    const exists = await presenceModel.find({ id_chamada: chamadaId, uuid });
    console.log("Presenças existentes para este UUID:", exists);

    if (exists.length > 0) {
      console.log("Erro: Dispositivo já foi usado para responder a chamada.");
      return res.status(400).json({
        success: false,
        message: `Esse Dispositivo já foi usado para responder a chamada.`,
      });
    }

    console.log("Criando nova presença...");
    const newPresence = await presenceModel.create({
      nome,
      long,
      lag,
      envio: dataAgora,
      ip,
      uuid,
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

const clearPresences = async (req, res) =>{
    const {chamadaId} = req.params

    try{
      const customInputs = await chamadaCustomInputModel.find({id_chamada: chamadaId})

      await presenceModel.deleteMany({
        id_chamada: chamadaId,
      });

      customInputs.forEach(async (input)=>{
        await chamadaInputValueModel.deleteMany({id_input: input._id})
      })

      res.status(201).json({ success: true });
    } catch (err) {
      console.log("Erro ao limpar presenças:", err);
      res.status(500).json({
        success: false,
        message: "Erro ao limpar presenças",
        error: err.message,
      });
    }
}

const forcePresence = async (req, res) =>{
    const {nome, customInputs} = req.body;
    const {chamadaId} = req.params

    try{
      const chamada = await chamadaModel.findById(chamadaId)

      const newPresence = await presenceModel.create({
        nome,
        long: chamada.long,
        lag: chamada.lag,
        envio: dataAgora,
        ip: "FORCED",
        uuid: v4(),
        id_chamada: chamadaId,
      });

      for (const key of Object.keys(customInputs)) {
        const inputValue = await chamadaInputValueModel.create({
          id_input: key,
          value: customInputs[key],
          presence_id: newPresence._id,
        });
        console.log("Input personalizado salvo:", inputValue);
      }
      res.status(201).json({ success: true });
    } catch (err) {
      console.log("Erro ao confirmar presença:", err);
      res.status(500).json({
        success: false,
        message: "Erro ao confirmar chamada",
        error: err.message,
      });
    }
}

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
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    console.log({lat, lon})
    const response = await axios.get(url, {
      params: {
        latlng: `${lat},${lon}`,
        key: apiKey,
        language: "pt-BR", // opcional
      },
    });

    const data = response.data;
    console.log(data)

    if (data.status !== "OK" || !data.results.length) {
      return { error: "Localização inválida" };
    }

    const result = data.results[0];

    // Buscar cidade, estado e país nos componentes do endereço
    let cidade, estado, pais;
    result.address_components.forEach((component) => {
      console.log(component)
      if (component.types.includes("administrative_area_level_2")) cidade = component.long_name;
      if (component.types.includes("administrative_area_level_1")) estado = component.short_name;
      if (component.types.includes("country")) pais = component.long_name;
    });

    return {
      cidade: cidade || null,
      estado: estado || null,
      pais: pais || null,
      enderecoCompleto: result.formatted_address,
    };
  } catch (err) {
    return { error: err.message };
  }
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
    console.log("Retornando presenças e customInputs:", {
      customInputs,
      populatedPresences,
    });
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

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export { confirmPresence, forcePresence, getAllPresencesFromChamada, exportChamada, clearPresences };
