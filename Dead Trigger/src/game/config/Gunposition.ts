export interface GunModelConfig {
    scale: number;
    modelPos: [number, number, number];
    modelRot: [number, number, number];
    hipPos: [number, number, number];
    hipRot: [number, number, number];
    adsPos: [number, number, number];
    adsRot: [number, number, number];
    sprintPos?: [number, number, number];
    sprintRot?: [number, number, number];
    envMapIntensity?: number;
}

export const GUN_MODELS: Record<string, GunModelConfig> = {
    "smg": {
        "scale": 0.03,
        "modelPos": [
            0.25,
            -0.1,
            -0.3
        ],
        "modelRot": [
            -0.21,
            179.44,
            -0.04
        ],
        "hipPos": [
            0.41,
            -1.03,
            -0.66
        ],
        "hipRot": [
            0.02,
            -0.23,
            0
        ],
        "adsPos": [
            -0.335,
            -0.905,
            0.015
        ],
        "adsRot": [
            -0.02,
            -0.365,
            0.045
        ],
        "envMapIntensity": 0.3,
        "sprintPos": [
            0.15,
            0.22,
            -0.59
        ],
        "sprintRot": [
            1.22,
            -0.3316125578789226,
            0.13962634015954636
        ]
    },
    "gs50": {
        "scale": 0.031,
        "modelPos": [
            0,
            -0.59,
            0
        ],
        "modelRot": [
            0,
            9.89,
            0
        ],
        "hipPos": [
            0.4,
            -0.31,
            -0.8
        ],
        "hipRot": [
            0,
            -0.38,
            -0.05
        ],
        "adsPos": [
            0,
            -0.22,
            -0.565
        ],
        "adsRot": [
            0,
            -0.465,
            0
        ],
        "envMapIntensity": 0.2,
        "sprintPos": [
            -0.16,
            -0.12,
            0.32
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "ak47": {
        "scale": 1.23,
        "modelPos": [
            2.49,
            0,
            6
        ],
        "modelRot": [
            0,
            90,
            0
        ],
        "hipPos": [
            0.45,
            -0.54,
            -1.61
        ],
        "hipRot": [
            0,
            -0.49,
            0
        ],
        "adsPos": [
            -0.0015555555555555555,
            -0.41,
            -0.78
        ],
        "adsRot": [
            0,
            -0.47,
            0
        ],
        "envMapIntensity": 0.5,
        "sprintPos": [
            -1.06,
            -0.15,
            0.84
        ],
        "sprintRot": [
            0,
            1.413716694115407,
            0
        ]
    },
    "as_val": {
        "scale": 0.4,
        "modelPos": [
            -0.22,
            0.11,
            -0.62
        ],
        "modelRot": [
            0,
            1.774,
            -0.02
        ],
        "hipPos": [
            0.7,
            -1.03,
            -0.55
        ],
        "hipRot": [
            -0.04,
            -0.3216,
            0
        ],
        "adsPos": [
            0.089,
            -0.855,
            -0.3
        ],
        "adsRot": [
            0.02,
            -0.2034,
            0
        ],
        "envMapIntensity": 0.05,
        "sprintPos": [
            -0.16,
            -0.13,
            -0.17
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "lw3_tundra": {
        "scale": 5,
        "modelPos": [
            0,
            0,
            0
        ],
        "modelRot": [
            0,
            90,
            0
        ],
        "hipPos": [
            1.03,
            -0.63,
            -1.13
        ],
        "hipRot": [
            0,
            -0.5,
            0
        ],
        "adsPos": [
            -0.005,
            -0.5,
            -0.78
        ],
        "adsRot": [
            0,
            -0.42,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            0.32,
            -0.54,
            0.05
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "pistol": {
        "scale": 0.001,
        "modelPos": [
            0,
            -0.01,
            0
        ],
        "modelRot": [
            0,
            181.03,
            0
        ],
        "hipPos": [
            0.61,
            -0.62,
            -1.16
        ],
        "hipRot": [
            0.05,
            -0.33,
            -0.01
        ],
        "adsPos": [
            0,
            -0.48,
            -1.055
        ],
        "adsRot": [
            0,
            -0.39,
            0
        ],
        "envMapIntensity": 1.2,
        "sprintPos": [
            -0.08,
            -0.24,
            0.05
        ],
        "sprintRot": [
            0.017453292519943295,
            1.2915436464758039,
            0.20943951023931953
        ]
    },
    "uzi": {
        "scale": 30,
        "modelPos": [
            2.51,
            -0.09,
            2.7
        ],
        "modelRot": [
            0,
            182.22,
            0
        ],
        "hipPos": [
            2.47,
            -3.47,
            -11.54
        ],
        "hipRot": [
            0,
            0,
            0
        ],
        "adsPos": [
            -2.46,
            -1.64,
            -9.185
        ],
        "adsRot": [
            -0.0005,
            -0.012,
            0
        ],
        "envMapIntensity": 1,
        "sprintPos": [
            5.69,
            5.73,
            1
        ],
        "sprintRot": [
            1.3788101090755203,
            -0.15707963267948966,
            0.3665191429188092
        ]
    },
    "mac10": {
        "scale": 0.5,
        "modelPos": [
            0,
            0,
            0
        ],
        "modelRot": [
            0,
            180,
            0
        ],
        "hipPos": [
            0.84,
            -1.41,
            -2.6
        ],
        "hipRot": [
            0,
            -0.88,
            0
        ],
        "adsPos": [
            0,
            -1.105,
            -2.225
        ],
        "adsRot": [
            0.05,
            -0.93,
            0
        ],
        "envMapIntensity": 0.5,
        "sprintPos": [
            1.77,
            1.8,
            -0.44
        ],
        "sprintRot": [
            1.3089969389957472,
            -0.2617993877991494,
            0.06981317007977318
        ]
    },
    "vector_smg": {
        "scale": 0.07,
        "modelPos": [
            0,
            0,
            0
        ],
        "modelRot": [
            0,
            0.47,
            0
        ],
        "hipPos": [
            1.35,
            -1.25,
            -1.64
        ],
        "hipRot": [
            0,
            -0.48,
            0
        ],
        "adsPos": [
            0,
            -0.91,
            -0.4
        ],
        "adsRot": [
            -0.01,
            -0.465,
            0
        ],
        "envMapIntensity": 0.5,
        "sprintPos": [
            0.44,
            0.22,
            0.05
        ],
        "sprintRot": [
            1.22,
            0,
            0
        ]
    },
    "fal": {
        "scale": 1,
        "modelPos": [
            -0.08,
            1.3,
            1.57
        ],
        "modelRot": [
            0,
            4.81,
            0
        ],
        "hipPos": [
            0.53,
            -1.56,
            -2.35
        ],
        "hipRot": [
            0,
            -0.05,
            0
        ],
        "adsPos": [
            0.22,
            -1.5,
            -2.17
        ],
        "adsRot": [
            0,
            -0.0953,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            -1.84,
            -0.23,
            0.99
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "m13": {
        "scale": 0.5,
        "modelPos": [
            4.51,
            -0.87,
            -3.43
        ],
        "modelRot": [
            0,
            89.93,
            0
        ],
        "hipPos": [
            1.72,
            -1.14,
            -1.68
        ],
        "hipRot": [
            0.01,
            -0.4,
            0
        ],
        "adsPos": [
            -0.17,
            -0.635,
            -0.68
        ],
        "adsRot": [
            -0.02,
            -0.385,
            0
        ],
        "envMapIntensity": 3,
        "sprintPos": [
            -0.16,
            -0.41,
            0.05
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "kar98k": {
        "scale": 2,
        "modelPos": [
            0,
            0,
            0
        ],
        "modelRot": [
            0,
            89.55,
            0
        ],
        "hipPos": [
            0.39,
            -0.27,
            0.35
        ],
        "hipRot": [
            0,
            0.03,
            0
        ],
        "adsPos": [
            0.003,
            -0.145,
            0.69
        ],
        "adsRot": [
            0,
            -0.01,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            0,
            0,
            0
        ],
        "sprintRot": [
            0.017453292519943295,
            0.03490658503988659,
            -0.2792526803190927
        ]
    },
    "sks": {
        "scale": 5,
        "modelPos": [
            0,
            -0.48,
            0
        ],
        "modelRot": [
            0,
            91.57,
            0
        ],
        "hipPos": [
            0.63,
            -0.51,
            -1.15
        ],
        "hipRot": [
            0,
            -0.5,
            0
        ],
        "adsPos": [
            0,
            -0.375,
            -0.95
        ],
        "adsRot": [
            0.01,
            -0.465,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            -0.42,
            -0.32,
            0.05
        ],
        "sprintRot": [
            -0.017453292519943295,
            1.3264502315156903,
            0
        ]
    },
    "krm262": {
        "scale": 0.03,
        "modelPos": [
            0,
            -0.37,
            0
        ],
        "modelRot": [
            0,
            91.58,
            0
        ],
        "hipPos": [
            0.99,
            -0.54,
            -1
        ],
        "hipRot": [
            0,
            -0.52,
            0
        ],
        "adsPos": [
            0,
            -0.145,
            -0.7
        ],
        "adsRot": [
            -0.09,
            -0.47,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            0.04,
            -0.28,
            0.05
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "odin": {
        "scale": 0.55,
        "modelPos": [
            0,
            0,
            0
        ],
        "modelRot": [
            0,
            88.44,
            0
        ],
        "hipPos": [
            0.95,
            -0.64,
            -1.36
        ],
        "hipRot": [
            0,
            -0.45,
            0
        ],
        "adsPos": [
            0.0157,
            -0.5,
            -0.625
        ],
        "adsRot": [
            0,
            -0.47,
            0
        ],
        "envMapIntensity": 0,
        "sprintPos": [
            -0.52,
            -0.31,
            0.05
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "mosquito": {
        "scale": 5,
        "modelPos": [
            0,
            0,
            0
        ],
        "modelRot": [
            0,
            0.45,
            0
        ],
        "hipPos": [
            0.49,
            -0.25,
            -0.9
        ],
        "hipRot": [
            0,
            -0.37,
            0
        ],
        "adsPos": [
            0,
            -0.12,
            -0.45
        ],
        "adsRot": [
            0,
            -0.465,
            0
        ],
        "sprintPos": [
            0,
            0,
            0
        ],
        "sprintRot": [
            0,
            0,
            0
        ],
        "envMapIntensity": 1.5
    },
    "grau556": {
        "scale": 3,
        "modelPos": [
            0,
            0.22,
            0
        ],
        "modelRot": [
            0,
            88.43,
            0
        ],
        "hipPos": [
            0.55,
            -0.55,
            -1
        ],
        "hipRot": [
            0,
            -0.48,
            0
        ],
        "adsPos": [
            0,
            -0.395,
            -0.72
        ],
        "adsRot": [
            0,
            -0.465,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            -0.58,
            -0.07,
            0.35
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "swarm_killer_smg": {
        "scale": 0.05,
        "modelPos": [
            -0.51,
            0.19,
            0
        ],
        "modelRot": [
            0,
            92.1,
            0
        ],
        "hipPos": [
            0.74,
            -0.37,
            -0.36
        ],
        "hipRot": [
            0,
            -0.81,
            0
        ],
        "adsPos": [
            0.495,
            -0.37,
            -0.43
        ],
        "adsRot": [
            0,
            -0.96,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            0.15,
            0.22,
            -0.2
        ],
        "sprintRot": [
            1.22,
            0,
            0
        ]
    },
    "dlq33": {
        "scale": 1,
        "modelPos": [
            0,
            0.32,
            0
        ],
        "modelRot": [
            0,
            91.58,
            0
        ],
        "hipPos": [
            0.64,
            -0.67,
            -1.76
        ],
        "hipRot": [
            0,
            -0.53,
            0
        ],
        "adsPos": [
            -0.01,
            -0.535,
            -1.675
        ],
        "adsRot": [
            0,
            -0.465,
            0
        ],
        "envMapIntensity": 1.5,
        "sprintPos": [
            -1.15,
            -0.18,
            0.65
        ],
        "sprintRot": [
            0,
            1.22,
            0
        ]
    },
    "swarm_killer_ar": {
        "scale": 3.5,
        "modelPos": [
            0,
            0,
            0
        ],
        "modelRot": [
            0,
            -1.115,
            0
        ],
        "hipPos": [
            0.67,
            -0.4,
            -1.37
        ],
        "hipRot": [
            0,
            -0.5,
            0
        ],
        "adsPos": [
            0,
            -0.28,
            -0.815
        ],
        "adsRot": [
            0.04,
            -0.465,
            0
        ],
        "envMapIntensity": 0.3,
        "sprintPos": [
            0.58,
            0.18,
            0.35
        ],
        "sprintRot": [
            1.4486232791552935,
            0,
            0
        ]
    }
};