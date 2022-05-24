import math
import time
import serial
import json
import mysql.connector as database  
import configparser
import datetime

from threading import Lock

from flask import Flask, render_template, session, request
from flask_socketio import SocketIO, emit, disconnect
async_mode = None

app = Flask(__name__)

config = configparser.ConfigParser()
config.read('config.cfg')
myhost = config.get('mysqlDB', 'host')
myuser = config.get('mysqlDB', 'user')
mypasswd = config.get('mysqlDB', 'passwd')
mydb = config.get('mysqlDB', 'db')
print(myhost)

app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)
thread = None
thread_lock = Lock()
ser=serial.Serial("/dev/ttyS0",9600)
ser.baudrate=9600

def background_thread(args):
    count = 0
    dataList = []
    db = database.connect(host=myhost, user=myuser, password=mypasswd, db=mydb)
    cursor = db.cursor()
    cursor.execute("SELECT MAX(IDMerania) FROM Meranie")
    maxid = cursor.fetchone()
    print(maxid)
    db.commit()
    if (maxid[0] == None):
        maxid = 0;
    else:
        maxid = maxid[0] + 1
    if args:
        sliderValue = dict(args).get('slider_value')
        active = dict(args).get('loadActive')
    else:
        sliderValue = 0
    global loadActive
    loadActive = 0
    while True:
        active = dict(args).get('loadActive')
        socketio.sleep(1)
        if (loadActive == 1):
            read_ser = ser.readline().decode().strip()
            try:
                json_parse = json.loads(read_ser)
                json_parse['time'] = time.time()

                dataList.append(json_parse)
                socketio.emit('my_response',
                          json_parse,
                          namespace='/test')
                cursor.execute("INSERT INTO Meranie (IDMerania, Senzor, Vstup, Cas) VALUES (%s, %s, %s, %s)",
                               (maxid, json_parse['sensor'], json_parse['input'], datetime.datetime.fromtimestamp(json_parse['time'])))
                
                db.commit()
            except Exception as e:
                print(f'Failed to parse {read_ser}, {e}')
        elif (loadActive == 2):
            file = open("static/files/meranie.txt", "a+");
            file.write("%s\r\n" %dataList);
            file.close()
            maxid = maxid + 1
            dataList = []
            loadActive = 0
       

        
@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template('index.html', async_mode=socketio.async_mode)


@app.route('/graphlive', methods=['GET', 'POST'])
def graphlive():
    return render_template('graphlive.html', async_mode=socketio.async_mode)


@app.route('/dbdata/<string:num>', methods=['GET', 'POST'])
def dbdata(num):
  db = database.connect(host=myhost, user=myuser, password=mypasswd, db=mydb)
  cursor = db.cursor()
  cursor.execute("SELECT Senzor FROM Meranie WHERE IDMerania=%s", [int(num)])
  rv = cursor.fetchall()
  newRv = json.dumps(rv)
  return newRv

@app.route('/read/<string:num>', methods=['GET', 'POST'])
def readmyfile(num):
    fo = open("static/files/meranie.txt","r")
    rows = fo.readlines()
    return rows[int(num)-1]


@app.route('/gauge', methods=['GET', 'POST'])
def gauge():
    return render_template('gauge.html', async_mode=socketio.async_mode)


@socketio.on('sensor_received_event', namespace='/test')
def db_message(message):
    session['sensor_value'] = message['sensor_value']


@socketio.on('slider_changed_event', namespace='/test')
def slider_message(message):
    session['slider_value'] = message['value']


@socketio.on('connect', namespace='/test')
def connect():
    global thread
    with thread_lock:
        if thread is None:
            session['loadActive'] = 1
            thread = socketio.start_background_task(target=background_thread, args=session._get_current_object())
    emit('my_response', {'data': 'Connected', 'count': 0})

@socketio.on('disconnect_request', namespace='/test')
def disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()

@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    print('Client disconnected', request.sid)

@socketio.on('start', namespace='/test')
def start(message):
    global loadActive
    loadActive = 1
    session['new_value'] = message['value']
    dump_new = json.dumps({"new": message['value']})
    ser.write((message['value'] + "\n").encode())
    session['loadActive'] = 1
    socketio.sleep(1)
    print('Simulation started')
    
@socketio.on('stop', namespace='/test')
def stop(msg):
    global loadActive
    loadActive = 2
    session['loadActive'] = 2
    socketio.sleep(1)
    print('Simulation stopped')

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=80, debug=True)
    