import Konva from "konva";
import { createMachine, createActor } from 'xstate';

// L'endroit où le dessin va être affiché
const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

// Une couche pour le dessin
const dessin = new Konva.Layer();
// Une couche pour la polyline en cours de construction
const temporaire = new Konva.Layer();
stage.add(dessin);
stage.add(temporaire);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiAIx8AbEQCsAdj6LN6xYoCcmgEwn1AGhCZEAWgAcmogBZDhxScMmAzCcUr7fwBfIKs0LDxCIggAJwBDAHcCKGp6ZloANSZ+ISQQNDFJaVkFBHVveyJNZwqjbz17Q2cVKxsy7yI+TRU+dXt1H0CTFRUQsIwcAmJYxOSKJnxxMBic2QKJKRk80tsDDvMTPhNNe2dnexN7Cta7GqcvNyvG5p6+ZzH8icjp+KT8FIWSxWilyIkKmxKiGcBiI9W80IuqmMuhuCFsZ0URBUhgqJlchhU6hUwVCnwiU2ivzmACE4gBjADWsGQ9LAqzy6yKW1ApU0-iIimcl3OjhUl3MqN2HRU3j6WmqmhxF3MH3CkyiMz+KVpjOZrJ4ILWog2xW2iD5hiIbjO5mcfPU6iOqPslU02kdePsfG8Rm6qq+FM1c1ojFYHG47LBJu58kQMvURH650U+nsKjtQslKYTXh9gS0w103n95I1VP+qVDbE4vENHONXMhCG8PSIl3U7hTb1MLe8kuOlUUV3OxMaeL5o1Jau+lNmFaYsDpcWQbMERvBpp5dkxvTe9WGYr03kM+lRil8sK0ui81T6gpCpPwqAgcCNpbA6+jTd22I08OtvhuEcOKSgMlRuPUQEEkSJbqsQpDkJ+jZmmiHiYuU+I1J4hjAX21jbkYbbqGcARvEYQrHLBM5Bv8SEQihRIdMqRzenwvREqifBYu6KiKsczjerimgPkEQA */
        id: "polyLine",
        initial: "idle",
        states : {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "drawing",
                        actions: "createLine"
                    }
                }
            },

            drawing: {
                on: {
                    MOUSEMOVE: {
                        target: "drawing",
                        actions: "setLastPoint"
                    },

                    Enter: [{
                        target: "idle",
                        guard: "plusDeDeuxPoints",
                        reenter: true,
                        actions: ["addPoint", "saveLine"]
                    }, "drawing"],

                    Backspace: [{
                        target: "drawing",
                        guard: "plusDeDeuxPoints",
                        actions: "removeLastPoint"
                    }, "drawing"],

                    MOUSECLICK: [{
                        target: "drawing",
                        guard: "pasPlein",
                        actions: "addPoint"
                    }, {
                        target: "idle",
                        reenter: true,
                        actions: "saveLine"
                    }],

                    Escape: {
                        target: "idle",
                        actions: "abandon"
                    }
                }
            }
        },
    },
    // Quelques actions et guardes que vous pouvez utiliser dans le statechart
    {
        actions: {
            // Créer une nouvelle polyline
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                console.log("Creating line", polyline);
                temporaire.add(polyline);
            },
            // Mettre à jour le dernier point (provisoire) de la polyline
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                temporaire.batchDraw();
            },
            // Enregistrer la polyline
            saveLine: (context, event) => {
                polyline.remove(); // On l'enlève de la couche temporaire
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                polyline.stroke("black"); // On change la couleur
                // On sauvegarde la polyline dans la couche de dessin
                dessin.add(polyline); // On l'ajoute à la couche de dessin
            },
            // Ajouter un point à la polyline
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
            // Abandonner le tracé de la polyline
            abandon: (context, event) => {
                polyline.remove();
            },
            // Supprimer le dernier point de la polyline
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            // On peut encore ajouter un point
            pasPlein: (context, event) => {
                return polyline.points().length < MAX_POINTS * 2;
            },
            // On peut enlever un point
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 4;
            },
        },
    }
);
// On démarre la machine d'état
const actor = createActor(polylineMachine);
actor.start();

// On transmet les événements au statechart
stage.on("click", () => {
    actor.send({type: "MOUSECLICK"});
});

stage.on("mousemove", () => {
    actor.send({type: "MOUSEMOVE"});
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    actor.send({type: event.key});
});
