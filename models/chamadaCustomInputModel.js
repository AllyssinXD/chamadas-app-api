import mongoose, { Schema } from "mongoose";

const chamadaCustomInputSchema = new Schema({
    id_chamada: {type: mongoose.Types.ObjectId, ref: 'chamada', required: true},
    label: {type: String, required: true}, 
    type: {type: String, required: true},
    // Configurações adicionais do input
    meta: {
        type: Object,
        required: false,
        default: {}
    },
    placeholder: {type: String, required: true},
})

export default mongoose.model('chamadaCustomInput', chamadaCustomInputSchema);