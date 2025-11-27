import mongoose, { Schema } from "mongoose";

const chamadaSchema = new Schema({
    nome: {type: String, required: true}, 
    dataInicio: {type: Date, required: true},
    dataFim: {type: Date, required: true},
    lag: {type: Number},
    long: {type: Number},
    toleranceMeters: {type: Number},
    ativa: {type: Boolean}
})

export default mongoose.model('chamada', chamadaSchema);