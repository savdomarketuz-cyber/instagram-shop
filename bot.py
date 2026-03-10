import telebot
from telebot import types
import firebase_admin
from firebase_admin import credentials, firestore
import re

print("--- Bot script boshlandi... ---")

# Firebase sozlamalari
# credentials.json faylingizni Firebase konsolidan yuklab oling va shu yerga joylang
# Hozircha foydalanuvchi o'rnatgan Firebase sozlamalaridan foydalanamiz
# Bot token
API_TOKEN = '8754518540:AAH30E84QZ1Ra2EUZ0khEJxNeMw3D_i3Dw8'
bot = telebot.TeleBot(API_TOKEN)

try:
    cred = credentials.Certificate("firebase-adminsdk.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Firebase error: {e}. Bot will run without database saving.")
    db = None

user_data = {} # Vaqtinchalik ma'lumotlarni saqlash uchun

print("--- Bot ishga tushdi... ---")

@bot.message_handler(commands=['start'])
def start(message):
    markup = types.ReplyKeyboardMarkup(one_time_keyboard=True, resize_keyboard=True)
    button = types.KeyboardButton("📱 Kontaktni yuborish", request_contact=True)
    markup.add(button)
    
    bot.send_message(
        message.chat.id, 
        "Assalomu alaykum! Do'konimizdan ro'yxatdan o'tish uchun quyidagi tugmani bosib telefon raqamingizni yuboring:", 
        reply_markup=markup
    )

@bot.message_handler(content_types=['contact'])
def contact(message):
    if message.contact is not None:
        phone_number = message.contact.phone_number
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number
        
        user_data[message.chat.id] = {'phone': phone_number}
        
        msg = bot.send_message(message.chat.id, "Yaxshi! Endi saytga kirish uchun yangi parol o'rnating:", reply_markup=types.ReplyKeyboardRemove())
        bot.register_next_step_handler(msg, process_password)

def process_password(message):
    password = message.text
    if len(password) < 6:
        msg = bot.send_message(message.chat.id, "Parol juda qisqa. Kamida 6 ta belgidan iborat parol kiriting:")
        bot.register_next_step_handler(msg, process_password)
        return
        
    user_data[message.chat.id]['password'] = password
    msg = bot.send_message(message.chat.id, "Parolni tasdiqlash uchun qayta kiriting:")
    bot.register_next_step_handler(msg, process_confirm_password)

def process_confirm_password(message):
    try:
        confirm_password = message.text
        chat_id = message.chat.id
        
        print(f"Confirming password for {chat_id}...", flush=True)
        
        if chat_id not in user_data:
            print(f"Error: chat_id {chat_id} not in user_data", flush=True)
            bot.send_message(message.chat.id, "Xatolik! Ma'lumotlar topilmadi. /start tugmasini bosib qaytadan boshlang.")
            return

        if confirm_password != user_data[chat_id]['password']:
            print("Passwords do not match", flush=True)
            msg = bot.send_message(message.chat.id, "Xatolik! Parollar mos kelmadi. Qaytadan parol kiriting:")
            bot.register_next_step_handler(msg, process_password)
            return
        
        # Firebase'ga saqlash
        phone = user_data[chat_id]['phone']
        password = user_data[chat_id]['password']
        
        print(f"Saving to Firebase: {phone}...", flush=True)
        
        if db:
            db.collection('users').document(phone).set({
                'phone': phone,
                'password': password,
                'telegram_id': chat_id,
                'created_at': firestore.SERVER_TIMESTAMP
            })
            print("Firebase save SUCCESS", flush=True)
        else:
            print(f"Bazada saqlanmadi (DB is None): {phone}", flush=True)
        
        bot.send_message(
            message.chat.id, 
            f"Muvaffaqiyatli! ✅\n\nSiz ro'yxatdan o'tdingiz.\nTelefon: {phone}\nSaytga kirib ushbu raqam va parolingizdan foydalanishingiz mumkin."
        )
        user_data.pop(chat_id, None)
    except Exception as e:
        print(f"Error in process_confirm_password: {e}", flush=True)
        bot.send_message(message.chat.id, "Texnik xatolik yuz berdi. Iltimos qaytadan urining.")

@bot.message_handler(commands=['reset'])
def reset_password(message):
    markup = types.ReplyKeyboardMarkup(one_time_keyboard=True, resize_keyboard=True)
    button = types.KeyboardButton("📱 Kontaktni yuborish (Tasdiqlash)", request_contact=True)
    markup.add(button)
    bot.send_message(message.chat.id, "Parolni tiklash uchun raqamingizni tasdiqlang:", reply_markup=markup)

bot.infinity_polling()
