import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import adminModel from '../models/adminModel.js'

const getAdmin = async(req, res)=>{
    let user = req.user.toObject();

    delete user.password;
    console.log(user)
    
    res.status(200).json({user})
}

const login = async(req, res)=>{
    const { username, email, password } = req.body

    try{
        if (!username && !password) {
            res.status(400).json({success: false, message: "Credenciais não podem estar vazias."})
            return
        }

        const user = await adminModel.findOne({username});

        if(!user){ 
            res.status(400).json({success: false, message: "Usuário não existe."})
            return
        }
        const isPassCorrect = await bcrypt.compare(password, user.password)
        if(!isPassCorrect){
            res.status(400).json({success: false, message: "Senha incorreta."})
            return
        }

        const token = jwt.sign({userId: user._id}, process.env.SECRET_KEY, {expiresIn: '1d'})
        res.cookie('token', token, {httpOnly: true, secure: true, sameSite: "none"}).status(200).json({success: true, token})
        return
    } catch(err){
        res.status(400).json({success: false, message: "Erro não tratado ao fazer login : " + err})
        return
    }
}

export {login, getAdmin};