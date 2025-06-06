import { usuario, moderador } from '.prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UserRegisterAuthDto } from './dto/UserRegisterAuth.dto';
import { UserLoginAuthDto } from './dto/UserLoginAuth.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ModeratorLoginAuthDto } from './dto/ModeratorLoginAuthDto';
import { ModeratorRegisterAuthDto } from './dto/ModeratorRegisterAuthDto';

let users = [];
@Injectable()
export class AuthUserService {

    constructor(private prisma: PrismaService) { }

    async registerUser(user: UserRegisterAuthDto) {
        const { password } = user;
        const hashedPassword = await hash(password, 10);
        user = { ...user, password: hashedPassword };
        console.log(hashedPassword);

        try {
            return await this.prisma.$transaction(async (prisma) => {
                const newUser = await prisma.usuario.create({
                    data: {
                        nombre: user.nombre,
                        apellidos: user.apellidos,
                        correo: user.correo,
                        dni: user.dni,
                        password: user.password,
                        estado: user.estado as string,
                        insignia: user.insignias || '1'
                    }
                });
                return newUser;
            });
        } catch (error) {
            throw new BadRequestException('Error al registrar al usuario');
        }
    }

    async registerModerator(moderator: ModeratorRegisterAuthDto) {
        const { password } = moderator;

        let hashedPassword;
        // Para evitar que se vuelva a hashear la contraseña al promover un usuario a moderador
        if (password.startsWith('$2b$')) {
            hashedPassword = password;
        } else {
            hashedPassword = await hash(password, 10);
        }

        moderator = { ...moderator, password: hashedPassword };
        try {
            return await this.prisma.moderador.create({
                data: {
                    nombre: moderator.nombre,
                    apellidos: moderator.apellidos,
                    correo: moderator.correo,
                    password: moderator.password,
                }
            });
        } catch (error) {
            throw new BadRequestException('Error al registrar al moderador');
        }
    }


    async getUser(user: UserLoginAuthDto): Promise<usuario> {
        return await this.prisma.usuario.findUnique({
            where: {
                correo: user.email
            }
        });
    }

    async getModerator(moderator: ModeratorLoginAuthDto): Promise<moderador> {
        return await this.prisma.moderador.findUnique({
            where: {
                correo: moderator.email
            }
        });
    }

    async upgradeUserToModerator(userId: number) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: Number(userId) }
        });

        if (!usuario) throw new BadRequestException('Usuario no encontrado');

        const newModerator = {
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            correo: usuario.correo,
            password: usuario.password
        }

        return newModerator;
    }

    async upgradeUser(userId: number) {
        const user = await this.prisma.usuario.findUnique({
            where: { id: Number(userId) }
        });

        if (!user) throw new BadRequestException('Usuario no encontrado');

        const insigniaNumber = parseInt(user.insignia, 10);
        if (isNaN(insigniaNumber)) throw new BadRequestException('Insignia no válida');

        const newUser = await this.prisma.usuario.update({
            where: { id: Number(userId) },
            data: {
                insignia: String(insigniaNumber + 1)
            }
        });

        if (!newUser) throw new BadRequestException('No se pudo promover al usuario');

        return newUser;
    }

    async getAllUsers() {
        return await this.prisma.usuario.findMany();
    }
}
